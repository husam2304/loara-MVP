<?php

namespace App\Enums;

enum AppointmentSource: string
{
    case Phone = 'phone';
    case Ai = 'ai';
    case Online = 'online';
    case WalkIn = 'walk_in';
}
