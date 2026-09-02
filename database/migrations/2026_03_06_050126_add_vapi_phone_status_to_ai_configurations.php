<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_configurations', function (Blueprint $table) {
            $table->string('vapi_phone_number_status', 20)->nullable()->after('vapi_phone_number');
            $table->string('vapi_phone_number_sip_uri')->nullable()->after('vapi_phone_number_status');
        });
    }

    public function down(): void
    {
        Schema::table('ai_configurations', function (Blueprint $table) {
            $table->dropColumn(['vapi_phone_number_status', 'vapi_phone_number_sip_uri']);
        });
    }
};
