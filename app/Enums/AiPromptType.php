<?php

namespace App\Enums;

enum AiPromptType: string
{
    case System = 'system';
    case Greeting = 'greeting';
    case Farewell = 'farewell';
    case Appointment = 'appointment';
    case Insurance = 'insurance';
    case Triage = 'triage';
    case FollowUp = 'follow_up';
}
