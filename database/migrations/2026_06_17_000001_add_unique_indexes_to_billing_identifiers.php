<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Gateway/customer/invoice identifiers must be unique so webhook handlers
 * resolve exactly one row (no cross-clinic mix-up) and invoices stay idempotent.
 * Columns are nullable, so multiple un-synced rows (NULL) remain allowed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinic_subscriptions', function (Blueprint $table) {
            $table->unique('gateway_customer_id');
            $table->unique('gateway_subscription_id');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->unique('stripe_invoice_id');
        });
    }

    public function down(): void
    {
        Schema::table('clinic_subscriptions', function (Blueprint $table) {
            $table->dropUnique(['gateway_customer_id']);
            $table->dropUnique(['gateway_subscription_id']);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropUnique(['stripe_invoice_id']);
        });
    }
};
