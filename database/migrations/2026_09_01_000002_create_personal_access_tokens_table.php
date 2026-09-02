<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * This is Laravel Sanctum's standard personal_access_tokens migration,
 * written directly rather than via `vendor:publish` so the mobile patient
 * auth feature is self-contained in this app's own migrations. Requires
 * `composer require laravel/sanctum` before this will run — Sanctum's
 * package classes (HasApiTokens, the auth guard, etc.) are not part of
 * this codebase yet.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
    }
};
