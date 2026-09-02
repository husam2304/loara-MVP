<?php

namespace App\Enums;

enum CampaignType: string
{
    case Reminder = 'reminder';
    case Recall = 'recall';
    case PreventiveCare = 'preventive_care';
    case Custom = 'custom';
}
