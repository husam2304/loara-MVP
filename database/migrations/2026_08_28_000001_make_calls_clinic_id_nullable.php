<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Allow calls to exist without a clinic so webhook events that cannot be
     * matched to a clinic are quarantined for review instead of dropped.
     */
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver !== 'sqlite') {
            Schema::table('calls', function (Blueprint $table) {
                $table->dropForeign(['clinic_id']);
            });
        }

        Schema::table('calls', function (Blueprint $table) {
            $table->unsignedBigInteger('clinic_id')->nullable()->change();
        });

        if ($driver !== 'sqlite') {
            Schema::table('calls', function (Blueprint $table) {
                $table->foreign('clinic_id')->references('id')->on('clinics')->cascadeOnDelete();
            });
        }
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver !== 'sqlite') {
            Schema::table('calls', function (Blueprint $table) {
                $table->dropForeign(['clinic_id']);
            });
        }

        Schema::table('calls', function (Blueprint $table) {
            $table->unsignedBigInteger('clinic_id')->nullable(false)->change();
        });

        if ($driver !== 'sqlite') {
            Schema::table('calls', function (Blueprint $table) {
                $table->foreign('clinic_id')->references('id')->on('clinics')->cascadeOnDelete();
            });
        }
    }
};
