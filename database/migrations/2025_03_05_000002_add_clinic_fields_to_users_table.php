<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('clinic_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->string('role', 20)->default('staff')->after('name');
            $table->string('phone', 20)->nullable()->after('email');
            $table->string('avatar_url')->nullable()->after('phone');
            $table->string('title', 50)->nullable()->after('avatar_url');
            $table->boolean('is_active')->default(true)->after('title');
            $table->timestamp('last_active_at')->nullable()->after('is_active');
            $table->boolean('two_factor_enabled')->default(false)->after('last_active_at');
            $table->unsignedSmallInteger('session_timeout_minutes')->default(30)->after('two_factor_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('clinic_id');
            $table->dropColumn([
                'role', 'phone', 'avatar_url', 'title',
                'is_active', 'last_active_at', 'two_factor_enabled', 'session_timeout_minutes',
            ]);
        });
    }
};
