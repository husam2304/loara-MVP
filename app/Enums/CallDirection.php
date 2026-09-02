<?php

namespace App\Enums;

enum CallDirection: string
{
    case Inbound = 'inbound';
    case Outbound = 'outbound';
    case Web = 'web';
}
