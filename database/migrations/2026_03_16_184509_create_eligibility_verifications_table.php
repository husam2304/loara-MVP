<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('eligibility_verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('patient_insurance_id')->constrained('patient_insurance')->cascadeOnDelete();
            $table->foreignId('insurance_provider_id')->constrained()->cascadeOnDelete();
            $table->foreignId('provider_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 20)->default('unknown');
            $table->string('payer_id', 30);
            $table->string('member_id');
            $table->date('service_date');
            $table->json('service_type_codes')->nullable();
            $table->json('plan_details')->nullable();
            $table->json('coverages')->nullable();
            $table->json('raw_response')->nullable();
            $table->text('error_message')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['clinic_id', 'patient_id']);
            $table->index(['patient_insurance_id', 'service_date'], 'ev_insurance_service_date_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('eligibility_verifications');
    }
};
