<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_configurations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('model', 50)->default('gpt-4o');
            $table->decimal('temperature', 2, 1)->default(0.7);
            $table->decimal('confidence_threshold', 3, 2)->default(0.85);
            $table->unsignedInteger('max_response_time_ms')->default(800);
            $table->string('voice_provider', 30)->default('elevenlabs');
            $table->string('voice_id')->nullable();
            $table->string('voice_name', 50)->default('alloy');
            $table->decimal('speaking_rate', 2, 1)->default(1.0);
            $table->string('language', 5)->default('en');
            $table->text('greeting_message')->nullable();
            $table->text('after_hours_message')->nullable();
            $table->text('system_prompt')->nullable();
            $table->boolean('sentiment_analysis_enabled')->default(true);
            $table->boolean('auto_escalation_enabled')->default(true);
            $table->boolean('multi_language_enabled')->default(false);
            $table->boolean('continuous_learning_enabled')->default(false);
            $table->timestamps();
        });

        Schema::create('ai_prompts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('type', 20);
            $table->text('content');
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('version')->default(1);
            $table->timestamps();

            $table->index(['clinic_id', 'type', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_prompts');
        Schema::dropIfExists('ai_configurations');
    }
};
