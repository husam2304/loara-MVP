<?php

namespace App\Enums;

enum TriageAction: string
{
    case TransferImmediately = 'transfer_immediately';
    case TransferNurse = 'transfer_nurse';
    case QueueCallback = 'queue_callback';
    case SendAlert = 'send_alert';
    case RouteToVoicemail = 'route_to_voicemail';
}
