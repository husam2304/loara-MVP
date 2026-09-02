<?php

namespace App\Services\Voice;

use App\Models\AiConfiguration;
use Illuminate\Contracts\Support\Arrayable;

class ResolvedVoiceConfig implements Arrayable
{
    public function __construct(
        public readonly string $language,
        public readonly string $transcriberProvider,
        public readonly string $transcriberModel,
        public readonly string $transcriberLanguage,
        public readonly string $modelProvider,
        public readonly string $model,
        public readonly string $voiceProvider,
        public readonly string $voiceId,
        public readonly string $voiceName,
        public readonly string $ttsLanguage,
        public readonly array $rawConfig
    ) {}

    public function toArray(): array
    {
        return array_merge($this->rawConfig, [
            'language' => $this->language,
            'transcriber_provider' => $this->transcriberProvider,
            'transcriber_model' => $this->transcriberModel,
            'transcriber_language' => $this->transcriberLanguage,
            'model_provider' => $this->modelProvider,
            'model' => $this->model,
            'voice_provider' => $this->voiceProvider,
            'voice_id' => $this->voiceId,
            'voice_name' => $this->voiceName,
            'tts_language' => $this->ttsLanguage,
        ]);
    }
}
