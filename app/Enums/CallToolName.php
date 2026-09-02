<?php

namespace App\Enums;

enum CallToolName: string
{
    case CheckSchedule = 'check_schedule';
    case BookAppointment = 'book_appointment';
    case LookupPatient = 'lookup_patient';
    case VerifyInsurance = 'verify_insurance';
    case TransferCall = 'transfer_call';
    case SendSms = 'send_sms';
    case CancelAppointment = 'cancel_appointment';
    case RescheduleAppointment = 'reschedule_appointment';
    case VerifyIdentity = 'verify_identity';
    case CheckAppointmentTypes = 'check_appointment_types';
    case AssessUrgency = 'assess_urgency';
    case CreatePatientLead = 'create_patient_lead';
    case ListUpcomingAppointments = 'list_upcoming_appointments';
    case CreateCallbackTask = 'create_callback_task';
}
