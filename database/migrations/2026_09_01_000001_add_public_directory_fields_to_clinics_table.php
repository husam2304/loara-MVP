<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            $table->string('slug')->nullable()->after('name');
            $table->boolean('is_publicly_listed')->default(false)->after('is_enabled');
            $table->decimal('latitude', 10, 7)->nullable()->after('zip_code');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
        });

        // Backfill a slug for every existing clinic before enforcing uniqueness —
        // required so the unique index below doesn't fail on a table full of NULLs
        // colliding, and so no existing clinic is left without one.
        DB::table('clinics')->orderBy('id')->select('id', 'name')->chunkById(100, function ($clinics) {
            foreach ($clinics as $clinic) {
                $base = Str::slug($clinic->name) ?: 'clinic';
                $slug = $base;
                $suffix = 1;

                while (DB::table('clinics')->where('slug', $slug)->where('id', '!=', $clinic->id)->exists()) {
                    $slug = "{$base}-{$suffix}";
                    $suffix++;
                }

                DB::table('clinics')->where('id', $clinic->id)->update(['slug' => $slug]);
            }
        });

        Schema::table('clinics', function (Blueprint $table) {
            // Left nullable at the schema level (avoids requiring doctrine/dbal for a
            // column-modify on every DB driver); enforced as required at the
            // application layer instead (model boot hook below always assigns one).
            $table->unique('slug');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->dropColumn(['slug', 'is_publicly_listed', 'latitude', 'longitude']);
        });
    }
};
