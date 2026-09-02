<?php

namespace App\Services\Voice;

class VoiceConfigurationResolver
{
    /**
     * Resolve the voice configuration by applying defaults and normalizing locales.
     */
    public function resolve(array $config): ResolvedVoiceConfig
    {
        $language = $this->normalizeStringValue($config['language'] ?? null, 'en');

        // 1. Transcriber
        $transcriberProvider = $this->normalizeStringValue($config['transcriber_provider'] ?? null, (
            $language === 'ar' ? 'soniox' : 'openai-whisper'
        ));
        $transcriberModel = $this->normalizeStringValue($config['transcriber_model'] ?? null, match ($transcriberProvider) {
            'deepgram' => 'nova-3',
            'openai', 'openai-whisper' => 'gpt-4o-transcribe',
            'soniox' => 'stt-rt-v5',
            default => '',
        });

        // 2. Model
        $modelProvider = $this->normalizeStringValue($config['model_provider'] ?? null, (
            $language === 'ar' ? 'google' : 'openai'
        ));
        $model = $this->normalizeStringValue($config['model'] ?? null, match ($modelProvider) {
            'anthropic' => 'claude-3-haiku-20240307',
            'google' => 'gemini-2.5-flash',
            'groq' => 'llama-3-8b-8192',
            'together-ai' => 'meta-llama/Llama-3-70b-chat-hf',
            'deep-seek' => 'deepseek-chat',
            'openai' => 'gpt-4o',
            default => '',
        });

        // 3. Voice
        $voiceProvider = $this->normalizeStringValue($config['voice_provider'] ?? null, (
            $language === 'ar' ? 'cartesia' : 'vapi'
        ));
        $voiceId = $this->normalizeStringValue($config['voice_id'] ?? null, match ($voiceProvider) {
            'cartesia' => '0901e6ce-4467-4225-b825-9618b108e4d3',
            'vapi' => 'Elliot',
            default => '',
        });
        $voiceName = $this->normalizeStringValue($config['voice_name'] ?? null, match ($voiceProvider) {
            'cartesia' => 'Arabic Voice',
            'vapi' => 'Elliot',
            default => '',
        });

        // 4. Locales
        $transcriberLanguage = match ($language) {
            'ar' => $transcriberProvider === 'azure' ? 'ar-JO' : 'ar',
            default => $language,
        };
        $ttsLanguage = $language === 'ar' ? 'ar' : $language;

        return new ResolvedVoiceConfig(
            language: $language,
            transcriberProvider: $transcriberProvider,
            transcriberModel: $transcriberModel,
            transcriberLanguage: $transcriberLanguage,
            modelProvider: $modelProvider,
            model: $model,
            voiceProvider: $voiceProvider,
            voiceId: $voiceId,
            voiceName: $voiceName,
            ttsLanguage: $ttsLanguage,
            rawConfig: $config
        );
    }

    protected function normalizeStringValue(mixed $value, string $fallback): string
    {
        if (is_array($value)) {
            foreach (['model', 'value', 'id', 'provider', 'name'] as $key) {
                if (isset($value[$key]) && is_string($value[$key])) {
                    return $value[$key];
                }
            }

            return $fallback;
        }

        if (is_string($value)) {
            return $value;
        }

        if (is_numeric($value)) {
            return (string) $value;
        }

        return $fallback;
    }
}
