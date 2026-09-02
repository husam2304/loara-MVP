<?php

namespace App\Enums;

enum InsurancePlanType: string
{
    case Hmo = 'hmo';
    case Ppo = 'ppo';
    case Epo = 'epo';
    case Pos = 'pos';
    case Hdhp = 'hdhp';
    case Medicaid = 'medicaid';
    case Medicare = 'medicare';
    case Other = 'other';
}
