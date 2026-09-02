<?php

namespace App\Enums;

enum IntegrationProvider: string
{
    case Epic = 'epic';
    case Athenahealth = 'athenahealth';
    case Drchrono = 'drchrono';
    case TwilioVoice = 'twilio_voice';
    case TwilioSms = 'twilio_sms';
    case Sendgrid = 'sendgrid';
    case GoogleCalendar = 'google_calendar';
    case Stripe = 'stripe';
    case Dentrix = 'dentrix';
    case OpenDental = 'open_dental';
    case Vapi = 'vapi';
}
