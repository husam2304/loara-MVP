<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('outbound_campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('type', 20);
            $table->string('status', 20)->default('draft');
            $table->text('message_template')->nullable();
            $table->json('target_criteria')->nullable();
            $table->dateTime('scheduled_at')->nullable();
            $table->dateTime('started_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->unsignedInteger('total_targets')->default(0);
            $table->unsignedInteger('calls_made')->default(0);
            $table->unsignedInteger('calls_answered')->default(0);
            $table->unsignedInteger('calls_failed')->default(0);
            $table->timestamps();
        });

        Schema::create('outbound_campaign_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained('outbound_campaigns')->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('call_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 20)->default('pending');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->dateTime('last_attempted_at')->nullable();
            $table->text('result')->nullable();
            $table->timestamps();

            $table->unique(['campaign_id', 'patient_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('outbound_campaign_entries');
        Schema::dropIfExists('outbound_campaigns');
    }
};
