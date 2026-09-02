<?php

namespace App\Enums;

enum GatewayConfigurationStatus: string
{
    case NotConfigured = 'not_configured';
    case Connected = 'connected';
    case Error = 'error';
}
