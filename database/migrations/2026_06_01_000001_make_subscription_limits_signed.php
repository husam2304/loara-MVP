<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Subscription limit columns store -1 to mean "unlimited" (Enterprise plan),
 * but were created as unsigned integers and rejected the sentinel on MySQL.
 * Make them signed so unlimited plans can be stored.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinic_subscriptions', function (Blueprint $table) {
            $table->integer('call_limit')->change();
            $table->integer('minutes_limit')->default(0)->change();
            $table->smallInteger('concurrent_limit')->change();
            $table->smallInteger('team_member_limit')->change();
        });
    }

    public function down(): void
    {
        Schema::table('clinic_subscriptions', function (Blueprint $table) {
            $table->unsignedInteger('call_limit')->change();
            $table->unsignedInteger('minutes_limit')->default(0)->change();
            $table->unsignedSmallInteger('concurrent_limit')->change();
            $table->unsignedSmallInteger('team_member_limit')->change();
        });
    }
};
