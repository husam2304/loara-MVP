<?php

namespace App\Enums;

enum KeywordCategory: string
{
    case Emergency = 'emergency';
    case Clinical = 'clinical';
    case Billing = 'billing';
    case General = 'general';
}
