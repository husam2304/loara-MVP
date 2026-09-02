<?php

namespace App\Enums;

enum CallStatus: string
{
    case Queued = 'queued';
    case Ringing = 'ringing';
    case InProgress = 'in_progress';
    case Completed = 'completed';
    case Missed = 'missed';
    case Failed = 'failed';
    case Transferred = 'transferred';
    case Voicemail = 'voicemail';
    case Ended = 'ended';
}
