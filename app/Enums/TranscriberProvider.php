<?php

namespace App\Enums;

enum TranscriberProvider: string
{
    case Deepgram = 'deepgram';
    case Google = 'google';
    case Gladia = 'gladia';
    case AssemblyAi = 'assembly-ai';
    case Azure = 'azure';
    case OpenAiWhisper = 'openai-whisper';
}
