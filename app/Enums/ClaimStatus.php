<?php

namespace App\Enums;

enum ClaimStatus: string
{
    case Submitted = 'submitted';
    case Pending = 'pending';
    case InReview = 'in_review';
    case Approved = 'approved';
    case Denied = 'denied';
    case Appealed = 'appealed';
}
