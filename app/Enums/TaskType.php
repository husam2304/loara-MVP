<?php

namespace App\Enums;

enum TaskType: string
{
    case Callback = 'callback';
    case FollowUp = 'follow_up';
    case Review = 'review';
    case Insurance = 'insurance';
    case Prescription = 'prescription';
    case General = 'general';
}
