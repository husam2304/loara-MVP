<?php

namespace App\Enums;

enum UsageType: string
{
    case AiCallMinutes = 'ai_call_minutes';
    case ConcurrentCalls = 'concurrent_calls';
    case SmsSent = 'sms_sent';
    case ApiCalls = 'api_calls';
}
