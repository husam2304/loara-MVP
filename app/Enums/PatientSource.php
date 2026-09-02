<?php

namespace App\Enums;

enum PatientSource: string
{
    case WalkIn = 'walk_in';
    case Referral = 'referral';
    case AiCall = 'ai_call';
    case Website = 'website';
    case Phone = 'phone';
}
