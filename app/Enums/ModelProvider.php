<?php

namespace App\Enums;

enum ModelProvider: string
{
    case OpenAi = 'openai';
    case Anthropic = 'anthropic';
    case Google = 'google';
    case Groq = 'groq';
    case TogetherAi = 'together-ai';
    case AzureOpenAi = 'azure-openai';
    case DeepSeek = 'deepseek';
    case CustomLlm = 'custom-llm';
}
