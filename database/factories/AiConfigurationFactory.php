<?php

namespace Database\Factories;

use App\Models\Clinic;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\AiConfiguration>
 */
class AiConfigurationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'clinic_id' => Clinic::factory(),
            'model_provider' => 'openai',
            'model' => 'gpt-4o',
            'temperature' => 0.7,
            'confidence_threshold' => 0.85,
            'max_response_time_ms' => 800,
            'voice_provider' => 'vapi',
            'voice_name' => 'Elliot',
            'speaking_rate' => 1.0,
            'transcriber_provider' => 'openai',
            'language' => 'en',
            'first_message_mode' => 'assistant-speaks-first',
            'greeting_message' => 'Thank you for calling {{clinic_name}}, this is {{app_name}}, your virtual assistant. How can I help you today?',
            'end_call_message' => "Thank you so much for calling {{clinic_name}}. If you need anything else, don't hesitate to call us back. Have a wonderful day!",
            'after_hours_message' => 'Thank you for calling {{clinic_name}}. Our office is currently closed. If this is a medical emergency, please hang up and call 9-1-1 right away. Otherwise, I can still help you schedule an appointment, cancel or reschedule an existing one, or take a message for your provider. What can I help you with?',
            'system_prompt' => 'You are {{app_name}}, the AI front desk receptionist for {{clinic_name}}. Keep responses to one to three sentences. Be warm and professional. Never provide medical advice. Always verify patient identity before making changes. For emergencies, direct callers to call 9-1-1 immediately.',
            'max_call_duration_seconds' => 1800,
            'silence_timeout_seconds' => 30,
            'hipaa_enabled' => false,
            'interruptions_enabled' => true,
            'backchanneling_enabled' => false,
            'background_sound' => 'office',
            'enable_recording' => true,
            'voicemail_detection_enabled' => false,
            'sentiment_analysis_enabled' => true,
            'auto_escalation_enabled' => true,
            'multi_language_enabled' => false,
            'continuous_learning_enabled' => false,
        ];
    }
}
