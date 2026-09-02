<?php

namespace App\Enums;

enum SubscriptionPlan: string
{
    case Starter = 'starter';
    case Growth = 'growth';
    case Professional = 'professional';
    case Enterprise = 'enterprise';
}
