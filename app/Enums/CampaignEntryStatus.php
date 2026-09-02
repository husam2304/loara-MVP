<?php

namespace App\Enums;

enum CampaignEntryStatus: string
{
    case Pending = 'pending';
    case Calling = 'calling';
    case Completed = 'completed';
    case Failed = 'failed';
    case Skipped = 'skipped';
    case OptedOut = 'opted_out';
}
