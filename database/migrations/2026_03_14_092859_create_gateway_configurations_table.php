<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('gateway_configurations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('gateway', 30);
            $table->boolean('is_active')->default(false);
            $table->text('credentials')->nullable();
            $table->string('status', 20)->default('not_configured');
            $table->text('error_message')->nullable();
            $table->dateTime('last_tested_at')->nullable();
            $table->timestamps();

            $table->unique(['clinic_id', 'gateway']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('gateway_configurations');
    }
};
