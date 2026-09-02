<?php

namespace App\Enums;

enum CallEndReason: string
{
    case AssistantError = 'assistant-error';
    case CustomerEndedCall = 'customer-ended-call';
    case SilenceTimedOut = 'silence-timed-out';
    case MaxDurationReached = 'max-duration-reached';
    case NoAnswer = 'no-answer';
    case ProviderEndedCall = 'provider-ended-call';
    case AssistantRequestedEnd = 'assistant-request-end';
    case TransferFailed = 'transfer-failed';
    case PipelineError = 'pipeline-error';
    case Unknown = 'unknown';
}
