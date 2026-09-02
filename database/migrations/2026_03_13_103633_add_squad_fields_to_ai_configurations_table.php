<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_configurations', function (Blueprint $table) {
            $table->string('vapi_squad_id')->nullable()->after('vapi_function_tool_ids');
            $table->string('workflow_mode', 10)->default('single')->after('vapi_squad_id');
        });
    }

    public function down(): void
    {
        Schema::table('ai_configurations', function (Blueprint $table) {
            $table->dropColumn(['vapi_squad_id', 'workflow_mode']);
        });
    }
};
