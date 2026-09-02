<?php

namespace App\Enums;

enum CallSpeaker: string
{
    case Ai = 'ai';
    case Patient = 'patient';
    case System = 'system';
    case Staff = 'staff';
}
