<?php

namespace App\Enums;

enum CallResolution: string
{
    case Resolved = 'resolved';
    case Escalated = 'escalated';
    case CallbackNeeded = 'callback_needed';
    case Voicemail = 'voicemail';
}
