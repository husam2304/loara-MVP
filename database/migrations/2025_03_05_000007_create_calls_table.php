<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->string('vapi_call_id')->unique()->nullable();
            $table->string('direction', 10);
            $table->string('caller_phone', 20);
            $table->string('caller_name')->nullable();
            $table->foreignId('patient_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 20)->default('general');
            $table->string('status', 20)->default('ringing');
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->dateTime('started_at');
            $table->dateTime('ended_at')->nullable();
            $table->dateTime('answered_at')->nullable();
            $table->foreignId('transferred_to')->nullable()->constrained('users')->nullOnDelete();
            $table->string('transfer_reason')->nullable();
            $table->boolean('ai_handled')->default(true);
            $table->decimal('ai_confidence_score', 3, 2)->nullable();
            $table->string('sentiment', 10)->nullable();
            $table->string('language', 5)->default('en');
            $table->string('resolution', 20)->nullable();
            $table->text('summary')->nullable();
            $table->decimal('cost', 8, 4)->nullable();
            $table->timestamps();

            $table->index(['clinic_id', 'started_at']);
            $table->index(['clinic_id', 'status']);
            $table->index(['patient_id', 'started_at']);
        });

        Schema::create('call_transcripts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('call_id')->constrained()->cascadeOnDelete();
            $table->string('speaker', 10);
            $table->text('content');
            $table->unsignedInteger('timestamp_ms');
            $table->decimal('confidence', 3, 2)->nullable();
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('call_recordings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('call_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('file_path');
            $table->string('file_url')->nullable();
            $table->unsignedInteger('duration_seconds');
            $table->unsignedBigInteger('file_size_bytes')->nullable();
            $table->string('format', 10)->default('wav');
            $table->boolean('is_redacted')->default(false);
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('call_tool_invocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('call_id')->constrained()->cascadeOnDelete();
            $table->string('tool_name', 30);
            $table->json('input_payload');
            $table->json('output_payload')->nullable();
            $table->unsignedInteger('duration_ms')->nullable();
            $table->boolean('success')->default(true);
            $table->text('error_message')->nullable();
            $table->dateTime('invoked_at');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('call_tool_invocations');
        Schema::dropIfExists('call_recordings');
        Schema::dropIfExists('call_transcripts');
        Schema::dropIfExists('calls');
    }
};
