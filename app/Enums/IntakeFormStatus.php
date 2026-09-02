<?php

namespace App\Enums;

enum IntakeFormStatus: string
{
    case Sent = 'sent';
    case Started = 'started';
    case Completed = 'completed';
    case Expired = 'expired';
}
