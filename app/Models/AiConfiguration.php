<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiConfiguration extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id', 'model_provider', 'model', 'temperature', 'confidence_threshold',
        'max_response_time_ms', 'voice_provider', 'voice_id', 'voice_name',
        'speaking_rate', 'language', 'transcriber_provider', 'transcriber_model',
        'greeting_message', 'greeting_message_ar', 'after_hours_message', 'after_hours_message_ar',
        'system_prompt', 'system_prompt_ar', 'sentiment_analysis_enabled', 'auto_escalation_enabled',
        'multi_language_enabled', 'continuous_learning_enabled',
        'vapi_assistant_id', 'vapi_phone_number_id', 'vapi_phone_number',
        'vapi_phone_number_status', 'vapi_phone_number_sip_uri', 'vapi_phone_number_provider',
        'vapi_knowledge_base_tool_id', 'vapi_function_tool_ids',
        'vapi_squad_id', 'workflow_mode',
        'max_call_duration_seconds', 'silence_timeout_seconds',
        'end_call_message', 'end_call_message_ar', 'first_message_mode',
        'hipaa_enabled', 'interruptions_enabled', 'backchanneling_enabled',
        'background_sound', 'enable_recording', 'voicemail_detection_enabled',
    ];

    protected function casts(): array
    {
        return [
            'temperature' => 'decimal:1',
            'confidence_threshold' => 'decimal:2',
            'max_response_time_ms' => 'integer',
            'speaking_rate' => 'decimal:1',
            'max_call_duration_seconds' => 'integer',
            'silence_timeout_seconds' => 'integer',
            'sentiment_analysis_enabled' => 'boolean',
            'auto_escalation_enabled' => 'boolean',
            'multi_language_enabled' => 'boolean',
            'continuous_learning_enabled' => 'boolean',
            'hipaa_enabled' => 'boolean',
            'interruptions_enabled' => 'boolean',
            'backchanneling_enabled' => 'boolean',
            'enable_recording' => 'boolean',
            'voicemail_detection_enabled' => 'boolean',
            'vapi_function_tool_ids' => 'array',
        ];
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function knowledgeBaseFiles(): HasMany
    {
        return $this->hasMany(KnowledgeBaseFile::class, 'clinic_id', 'clinic_id');
    }
}
