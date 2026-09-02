<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateVapiConfigurationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'model_provider' => ['required', 'string', 'max:30'],
            'model' => ['required', 'string', 'max:50'],
            'temperature' => ['required', 'numeric', 'between:0,1'],
            'confidence_threshold' => ['required', 'numeric', 'between:0,1'],
            'max_response_time_ms' => ['required', 'integer', 'min:500', 'max:30000'],
            'voice_provider' => ['required', 'string', 'max:30'],
            'voice_id' => ['nullable', 'string', 'max:255'],
            'voice_name' => ['required', 'string', 'max:50'],
            'speaking_rate' => ['required', 'numeric', 'between:0.5,2.0'],
            'transcriber_provider' => ['required', 'string', 'max:30'],
            'transcriber_model' => ['nullable', 'string', 'max:50'],
            'language' => ['required', 'string', 'max:10'],
            'first_message_mode' => ['required', 'string', 'max:50'],
            'greeting_message' => ['nullable', 'string', 'max:2000'],
            'greeting_message_ar' => ['nullable', 'string', 'max:2000'],
            'end_call_message' => ['nullable', 'string', 'max:2000'],
            'end_call_message_ar' => ['nullable', 'string', 'max:2000'],
            'after_hours_message' => ['nullable', 'string', 'max:2000'],
            'after_hours_message_ar' => ['nullable', 'string', 'max:2000'],
            'system_prompt' => ['nullable', 'string', 'max:10000'],
            'system_prompt_ar' => ['nullable', 'string', 'max:10000'],
            'max_call_duration_seconds' => ['required', 'integer', 'min:60', 'max:7200'],
            'silence_timeout_seconds' => ['required', 'integer', 'min:5', 'max:300'],
            'interruptions_enabled' => ['required', 'boolean'],
            'backchanneling_enabled' => ['required', 'boolean'],
            'background_sound' => ['required', 'string', 'max:10'],
            'voicemail_detection_enabled' => ['required', 'boolean'],
            'hipaa_enabled' => ['required', 'boolean'],
            'enable_recording' => ['required', 'boolean'],
            'sentiment_analysis_enabled' => ['required', 'boolean'],
            'auto_escalation_enabled' => ['required', 'boolean'],
            'multi_language_enabled' => ['required', 'boolean'],
            'continuous_learning_enabled' => ['required', 'boolean'],
        ];
    }
}
