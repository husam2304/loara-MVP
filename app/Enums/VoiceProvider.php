<?php

namespace App\Enums;

enum VoiceProvider: string
{
    case ElevenLabs = 'elevenlabs';
    case Cartesia = 'cartesia';
    case PlayHt = 'playht';
    case Deepgram = 'deepgram';
    case OpenAi = 'openai';
    case Azure = 'azure';
    case RimeAi = 'rime-ai';
}
