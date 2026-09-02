<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_configurations', function (Blueprint $table) {
            $table->string('model_provider', 30)->default('openai')->after('clinic_id');
            $table->string('transcriber_provider', 30)->default('deepgram')->after('language');
            $table->string('transcriber_model', 50)->nullable()->after('transcriber_provider');
            $table->string('vapi_assistant_id')->nullable()->after('continuous_learning_enabled');
            $table->string('vapi_phone_number_id')->nullable()->after('vapi_assistant_id');
            $table->unsignedInteger('max_call_duration_seconds')->default(1800)->after('vapi_phone_number_id');
            $table->unsignedInteger('silence_timeout_seconds')->default(30)->after('max_call_duration_seconds');
            $table->text('end_call_message')->nullable()->after('silence_timeout_seconds');
            $table->string('first_message_mode', 50)->default('assistant-speaks-first')->after('end_call_message');
            $table->boolean('hipaa_enabled')->default(false)->after('first_message_mode');
            $table->boolean('interruptions_enabled')->default(true)->after('hipaa_enabled');
            $table->boolean('backchanneling_enabled')->default(false)->after('interruptions_enabled');
            $table->string('background_sound', 10)->default('office')->after('backchanneling_enabled');
            $table->boolean('enable_recording')->default(true)->after('background_sound');
            $table->boolean('voicemail_detection_enabled')->default(false)->after('enable_recording');
        });

        Schema::table('calls', function (Blueprint $table) {
            $table->string('end_reason', 50)->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('ai_configurations', function (Blueprint $table) {
            $table->dropColumn([
                'model_provider', 'transcriber_provider', 'transcriber_model',
                'vapi_assistant_id', 'vapi_phone_number_id',
                'max_call_duration_seconds', 'silence_timeout_seconds',
                'end_call_message', 'first_message_mode',
                'hipaa_enabled', 'interruptions_enabled', 'backchanneling_enabled',
                'background_sound', 'enable_recording', 'voicemail_detection_enabled',
            ]);
        });

        Schema::table('calls', function (Blueprint $table) {
            $table->dropColumn('end_reason');
        });
    }
};
