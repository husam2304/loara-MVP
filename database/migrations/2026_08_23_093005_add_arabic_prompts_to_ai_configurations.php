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
        Schema::table('ai_configurations', function (Blueprint $table) {
            $table->text('greeting_message_ar')->nullable()->after('greeting_message');
            $table->text('end_call_message_ar')->nullable()->after('end_call_message');
            $table->text('after_hours_message_ar')->nullable()->after('after_hours_message');
            $table->text('system_prompt_ar')->nullable()->after('system_prompt');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ai_configurations', function (Blueprint $table) {
            $table->dropColumn([
                'greeting_message_ar',
                'end_call_message_ar',
                'after_hours_message_ar',
                'system_prompt_ar'
            ]);
        });
    }
};
