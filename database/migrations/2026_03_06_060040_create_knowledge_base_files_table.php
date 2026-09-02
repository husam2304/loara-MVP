<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('knowledge_base_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->string('original_name');
            $table->unsignedInteger('file_size');
            $table->string('mime_type', 100);
            $table->string('vapi_file_id');
            $table->timestamps();

            $table->index('clinic_id');
        });

        Schema::table('ai_configurations', function (Blueprint $table) {
            $table->string('vapi_knowledge_base_tool_id')->nullable()->after('vapi_phone_number_sip_uri');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('knowledge_base_files');

        Schema::table('ai_configurations', function (Blueprint $table) {
            $table->dropColumn('vapi_knowledge_base_tool_id');
        });
    }
};
