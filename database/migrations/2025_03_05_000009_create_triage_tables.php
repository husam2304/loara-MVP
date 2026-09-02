<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('triage_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('priority', 10)->default('medium');
            $table->json('conditions');
            $table->string('action', 30);
            $table->string('target_role', 30)->nullable();
            $table->foreignId('target_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('triage_keywords', function (Blueprint $table) {
            $table->id();
            $table->foreignId('triage_rule_id')->constrained()->cascadeOnDelete();
            $table->string('keyword');
            $table->string('category', 20)->default('general');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('escalation_paths', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('level');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('target_role', 30);
            $table->unsignedInteger('timeout_seconds')->default(60);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['clinic_id', 'level']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('escalation_paths');
        Schema::dropIfExists('triage_keywords');
        Schema::dropIfExists('triage_rules');
    }
};
