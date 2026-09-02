<?php

namespace App\Enums;

enum CallType: string
{
    case Appointment = 'appointment';
    case Insurance = 'insurance';
    case Billing = 'billing';
    case Prescription = 'prescription';
    case Triage = 'triage';
    case General = 'general';
    case FollowUp = 'follow_up';
    case Reminder = 'reminder';
}
