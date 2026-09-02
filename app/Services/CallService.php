<?php

namespace App\Services;

use App\Models\CallRecording;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class CallService
{
    public function refreshRecordingUrl(
        CallRecording $recording
    ): ?string {
        $startedAt = microtime(true);

        Log::info('CallService::refreshRecordingUrl - START', [
            'call_recording_id' => $recording->id,
            'call_id' => $recording->call_id,
        ]);

        try {
            // ---------------------------------------------------------
            // 1. Get Vapi call ID
            // ---------------------------------------------------------

            $vapiCallId = $recording->call?->vapi_call_id;

            Log::debug(
                'CallService::refreshRecordingUrl - Vapi call ID',
                [
                    'call_recording_id' => $recording->id,
                    'call_id' => $recording->call_id,
                    'vapi_call_id' => $vapiCallId,
                    'vapi_call_id_exists' => ! empty($vapiCallId),
                ]
            );

            // ---------------------------------------------------------
            // 2. Get private key
            // ---------------------------------------------------------

            $privateKey = config('vapi.private_key');

            $baseUrl = config(
                'vapi.base_url',
                'https://api.vapi.ai'
            );

            Log::debug(
                'CallService::refreshRecordingUrl - Vapi configuration',
                [
                    'call_recording_id' => $recording->id,
                    'base_url' => $baseUrl,
                    'private_key_exists' => ! empty($privateKey),
                    'private_key_length' => $privateKey
                        ? strlen($privateKey)
                        : 0,
                ]
            );

            // ---------------------------------------------------------
            // 3. Missing configuration
            // ---------------------------------------------------------

            if (! $vapiCallId || ! $privateKey) {

                Log::warning(
                    'CallService::refreshRecordingUrl - Missing required Vapi data',
                    [
                        'call_recording_id' => $recording->id,
                        'vapi_call_id_exists' => ! empty($vapiCallId),
                        'private_key_exists' => ! empty($privateKey),
                    ]
                );

                return null;
            }

            // ---------------------------------------------------------
            // 4. Build request
            // ---------------------------------------------------------

            $endpoint = "/call/{$vapiCallId}";

            Log::debug(
                'CallService::refreshRecordingUrl - Sending Vapi request',
                [
                    'call_recording_id' => $recording->id,
                    'vapi_call_id' => $vapiCallId,
                    'base_url' => $baseUrl,
                    'endpoint' => $endpoint,
                ]
            );

            // ---------------------------------------------------------
            // 5. Call Vapi
            // ---------------------------------------------------------

            $response = Http::baseUrl($baseUrl)
                ->withToken($privateKey)
                ->acceptJson()
                ->timeout(30)
                ->get($endpoint);

            $duration = round(
                (microtime(true) - $startedAt) * 1000
            );

            Log::debug(
                'CallService::refreshRecordingUrl - Vapi response received',
                [
                    'call_recording_id' => $recording->id,
                    'vapi_call_id' => $vapiCallId,
                    'status' => $response->status(),
                    'successful' => $response->successful(),
                    'duration_ms' => $duration,
                ]
            );

            // ---------------------------------------------------------
            // 6. Handle failed Vapi response
            // ---------------------------------------------------------

            if (! $response->successful()) {

                Log::warning(
                    'CallService::refreshRecordingUrl - Vapi request FAILED',
                    [
                        'call_recording_id' => $recording->id,
                        'vapi_call_id' => $vapiCallId,
                        'status' => $response->status(),
                        'reason' => $response->reason(),
                        'response_body' => $response->body(),
                        'duration_ms' => $duration,
                    ]
                );

                return null;
            }

            // ---------------------------------------------------------
            // 7. Parse response
            // ---------------------------------------------------------

            $json = $response->json();

            Log::debug(
                'CallService::refreshRecordingUrl - Vapi response parsed',
                [
                    'call_recording_id' => $recording->id,
                    'response_keys' => is_array($json)
                        ? array_keys($json)
                        : [],
                    'artifact_exists' => is_array($json)
                        && isset($json['artifact']),
                ]
            );

            // ---------------------------------------------------------
            // 8. Extract fresh recording URL
            // ---------------------------------------------------------

            $freshUrl =
                $response->json('artifact.presignedMonoUrl')
                ?? $response->json('artifact.recordingUrl')
                ?? $response->json('artifact.recording.url')
                ?? $response->json('recordingUrl');

            Log::debug(
                'CallService::refreshRecordingUrl - Recording URL extracted',
                [
                    'call_recording_id' => $recording->id,
                    'url_exists' => ! empty($freshUrl),
                    'url_changed' => $freshUrl !== $recording->file_url,
                    'old_url_exists' => ! empty($recording->file_url),
                ]
            );

            // ---------------------------------------------------------
            // 9. Update database
            // ---------------------------------------------------------

            if ($freshUrl && $freshUrl !== $recording->file_url) {

                $oldUrl = $recording->file_url;

                $recording->update([
                    'file_url' => $freshUrl,
                ]);

                Log::info(
                    'CallService::refreshRecordingUrl - Recording URL UPDATED',
                    [
                        'call_recording_id' => $recording->id,
                        'old_url' => $oldUrl,
                        'new_url' => $freshUrl,
                    ]
                );
            } elseif (! $freshUrl) {

                Log::warning(
                    'CallService::refreshRecordingUrl - No recording URL found',
                    [
                        'call_recording_id' => $recording->id,
                        'vapi_call_id' => $vapiCallId,
                    ]
                );
            } else {

                Log::debug(
                    'CallService::refreshRecordingUrl - URL unchanged',
                    [
                        'call_recording_id' => $recording->id,
                    ]
                );
            }

            // ---------------------------------------------------------
            // 10. END
            // ---------------------------------------------------------

            $totalDuration = round(
                (microtime(true) - $startedAt) * 1000
            );

            Log::info(
                'CallService::refreshRecordingUrl - END',
                [
                    'call_recording_id' => $recording->id,
                    'vapi_call_id' => $vapiCallId,
                    'url_exists' => ! empty($freshUrl),
                    'total_duration_ms' => $totalDuration,
                ]
            );

            return $freshUrl;

        } catch (Throwable $e) {

            $duration = round(
                (microtime(true) - $startedAt) * 1000
            );

            Log::error(
                'CallService::refreshRecordingUrl - EXCEPTION',
                [
                    'call_recording_id' => $recording->id ?? null,
                    'call_id' => $recording->call_id ?? null,
                    'exception_class' => get_class($e),
                    'exception_message' => $e->getMessage(),
                    'exception_code' => $e->getCode(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'duration_ms' => $duration,
                    'trace' => $e->getTraceAsString(),
                ]
            );

            return null;
        }
    }
}
