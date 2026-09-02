<?php

namespace App\Enums;

enum EligibilityVerificationStatus: string
{
    case Active = 'active';
    case Inactive = 'inactive';
    case Error = 'error';
    case Unknown = 'unknown';
}
