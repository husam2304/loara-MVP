<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clinic_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->string('plan', 20);
            $table->string('status', 20)->default('trialing');
            $table->decimal('price_monthly', 8, 2);
            $table->unsignedInteger('call_limit');
            $table->unsignedSmallInteger('concurrent_limit');
            $table->unsignedSmallInteger('team_member_limit');
            $table->string('stripe_subscription_id')->nullable();
            $table->string('stripe_customer_id')->nullable();
            $table->dateTime('trial_ends_at')->nullable();
            $table->date('current_period_start');
            $table->date('current_period_end');
            $table->dateTime('cancelled_at')->nullable();
            $table->timestamps();
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subscription_id')->nullable()->constrained('clinic_subscriptions')->nullOnDelete();
            $table->string('stripe_invoice_id')->nullable();
            $table->string('number')->unique();
            $table->decimal('amount', 10, 2);
            $table->decimal('tax', 10, 2)->default(0);
            $table->decimal('total', 10, 2);
            $table->string('status', 10)->default('pending');
            $table->date('period_start');
            $table->date('period_end');
            $table->dateTime('paid_at')->nullable();
            $table->date('due_at');
            $table->string('pdf_url')->nullable();
            $table->timestamps();

            $table->index(['clinic_id', 'status']);
        });

        Schema::create('usage_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20);
            $table->decimal('quantity', 10, 2);
            $table->date('recorded_date');
            $table->timestamp('created_at')->nullable();

            $table->index(['clinic_id', 'type', 'recorded_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('usage_records');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('clinic_subscriptions');
    }
};
