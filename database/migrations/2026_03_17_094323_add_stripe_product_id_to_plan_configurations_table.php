<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plan_configurations', function (Blueprint $table) {
            $table->string('stripe_product_id')->nullable()->after('features');
        });
    }

    public function down(): void
    {
        Schema::table('plan_configurations', function (Blueprint $table) {
            $table->dropColumn('stripe_product_id');
        });
    }
};
