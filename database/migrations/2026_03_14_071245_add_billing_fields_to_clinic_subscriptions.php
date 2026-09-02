<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinic_subscriptions', function (Blueprint $table) {
            $table->string('billing_cycle', 10)->default('monthly')->after('plan');
            $table->unsignedInteger('minutes_limit')->default(0)->after('call_limit');
            $table->string('gateway', 20)->default('stripe')->after('stripe_customer_id');
            $table->string('gateway_subscription_id')->nullable()->after('gateway');
            $table->string('gateway_customer_id')->nullable()->after('gateway_subscription_id');
        });
    }

    public function down(): void
    {
        Schema::table('clinic_subscriptions', function (Blueprint $table) {
            $table->dropColumn([
                'billing_cycle',
                'minutes_limit',
                'gateway',
                'gateway_subscription_id',
                'gateway_customer_id',
            ]);
        });
    }
};
