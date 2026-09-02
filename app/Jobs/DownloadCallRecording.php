<?php

namespace App\Jobs;

use App\Models\CallRecording;
use App\Services\CallService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class DownloadCallRecording implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(public int $callRecordingId)
    {
        Log::debug('DownloadCallRecording::__construct', [
            'call_recording_id' => $callRecordingId,
            'tries' => $this->tries,
            'backoff' => $this->backoff,
        ]);
    }

    /**
     * Download the recording audio from Vapi into local storage.
     */
    public function handle(): void
    {
        $startedAt = microtime(true);

        Log::info('DownloadCallRecording::handle - START', [
            'call_recording_id' => $this->callRecordingId,
            'job_class' => static::class,
            'attempt' => $this->attempts(),
            'max_tries' => $this->tries,
            'backoff' => $this->backoff,
        ]);

        try {
            // ---------------------------------------------------------
            // 1. Load recording
            // ---------------------------------------------------------

            Log::debug('DownloadCallRecording - Loading CallRecording', [
                'call_recording_id' => $this->callRecordingId,
                'with' => ['call'],
            ]);

            $recording = CallRecording::with('call')
                ->find($this->callRecordingId);

            Log::debug('DownloadCallRecording - CallRecording lookup completed', [
                'call_recording_id' => $this->callRecordingId,
                'found' => (bool) $recording,
                'recording_id' => $recording?->id,
            ]);

            // ---------------------------------------------------------
            // 2. Recording does not exist
            // ---------------------------------------------------------

            if (! $recording) {
                Log::warning('DownloadCallRecording - Recording NOT FOUND', [
                    'call_recording_id' => $this->callRecordingId,
                ]);

                return;
            }

            // ---------------------------------------------------------
            // 3. Log recording state
            // ---------------------------------------------------------

            Log::debug('DownloadCallRecording - Recording loaded', [
                'recording_id' => $recording->id,
                'call_id' => $recording->call_id,
                'file_url_exists' => ! empty($recording->file_url),
                'file_path' => $recording->file_path,
                'file_size_bytes' => $recording->file_size_bytes,
                'format' => $recording->format,

                'call_loaded' => $recording->relationLoaded('call'),
                'vapi_call_id' => $recording->call?->vapi_call_id,
                'clinic_id' => $recording->call?->clinic_id,
            ]);

            // ---------------------------------------------------------
            // 4. No file URL
            // ---------------------------------------------------------

            if (! $recording->file_url) {
                Log::warning('DownloadCallRecording - No file_url', [
                    'call_recording_id' => $recording->id,
                    'call_id' => $recording->call_id,
                ]);

                return;
            }

            // ---------------------------------------------------------
            // 5. Log original URL safely
            // ---------------------------------------------------------

            Log::debug('DownloadCallRecording - Original recording URL', [
                'call_recording_id' => $recording->id,
                'url' => $this->sanitizeUrl($recording->file_url),
                'url_host' => parse_url($recording->file_url, PHP_URL_HOST),
                'url_path' => parse_url($recording->file_url, PHP_URL_PATH),
            ]);

            // ---------------------------------------------------------
            // 6. Check if already downloaded
            // ---------------------------------------------------------

            Log::debug('DownloadCallRecording - Checking existing file', [
                'call_recording_id' => $recording->id,
                'file_path' => $recording->file_path,
                'file_path_is_empty' => $recording->file_path === '',
            ]);

            $fileExists = false;

            if ($recording->file_path !== '') {
                $fileExists = Storage::exists($recording->file_path);

                Log::debug('DownloadCallRecording - Storage existence check', [
                    'call_recording_id' => $recording->id,
                    'file_path' => $recording->file_path,
                    'exists' => $fileExists,
                    'disk' => config('filesystems.default'),
                ]);
            }

            // ---------------------------------------------------------
            // 7. Already downloaded
            // ---------------------------------------------------------

            if ($recording->file_path !== '' && $fileExists) {
                Log::info('DownloadCallRecording - Already downloaded, SKIPPING', [
                    'call_recording_id' => $recording->id,
                    'call_id' => $recording->call_id,
                    'file_path' => $recording->file_path,
                ]);

                return;
            }

            // ---------------------------------------------------------
            // 8. Download from stored URL
            // ---------------------------------------------------------

            Log::info('DownloadCallRecording - Starting HTTP download', [
                'call_recording_id' => $recording->id,
                'url' => $this->sanitizeUrl($recording->file_url),
                'host' => parse_url($recording->file_url, PHP_URL_HOST),
                'timeout' => 120,
                'attempt' => $this->attempts(),
            ]);

            $downloadStartedAt = microtime(true);

            $response = Http::timeout(120)
                ->get($recording->file_url);

            $downloadDuration = round(
                (microtime(true) - $downloadStartedAt) * 1000
            );

            // ---------------------------------------------------------
            // 9. Log HTTP response
            // ---------------------------------------------------------

            Log::info('DownloadCallRecording - HTTP download response', [
                'call_recording_id' => $recording->id,
                'status' => $response->status(),
                'successful' => $response->successful(),
                'failed' => $response->failed(),
                'duration_ms' => $downloadDuration,

                'content_type' => $response->header('Content-Type'),
                'content_length_header' => $response->header('Content-Length'),

                'body_size_bytes' => strlen($response->body()),
            ]);

            // ---------------------------------------------------------
            // 10. Stored URL failed
            // ---------------------------------------------------------

            if (! $response->successful()) {

                Log::warning(
                    'DownloadCallRecording - Initial download FAILED, attempting URL refresh',
                    [
                        'call_recording_id' => $recording->id,
                        'call_id' => $recording->call_id,
                        'status' => $response->status(),
                        'reason' => $response->reason(),
                        'url' => $this->sanitizeUrl($recording->file_url),
                    ]
                );

                // -----------------------------------------------------
                // 11. Refresh URL from Vapi
                // -----------------------------------------------------

                Log::info('DownloadCallRecording - Calling refreshRecordingUrl()', [
                    'call_recording_id' => $recording->id,
                    'vapi_call_id' => $recording->call?->vapi_call_id,
                ]);

                $oldUrl = $recording->file_url;
                $freshUrl = $this->refreshRecordingUrl($recording);

                if ($freshUrl && $freshUrl !== $oldUrl) {

                    $retryStartedAt = microtime(true);

                    $response = Http::timeout(120)
                        ->get($freshUrl);

                    $retryDuration = round(
                        (microtime(true) - $retryStartedAt) * 1000
                    );

                } else {
                    // NOTE: This branch is hit both when Vapi genuinely
                    // returned nothing, AND when it returned a URL that's
                    // identical to the one that already failed. Those are
                    // very different failure modes, so log them distinctly
                    // to make this diagnosable from logs alone next time.
                    if ($freshUrl && $freshUrl === $oldUrl) {
                        Log::warning(
                            'DownloadCallRecording - Vapi returned UNCHANGED URL (likely wrong artifact field extracted)',
                            [
                                'call_recording_id' => $recording->id,
                                'call_id' => $recording->call_id,
                                'url' => $this->sanitizeUrl($freshUrl),
                            ]
                        );
                    } else {
                        Log::warning(
                            'DownloadCallRecording - No usable fresh URL returned',
                            [
                                'call_recording_id' => $recording->id,
                                'fresh_url_exists' => ! empty($freshUrl),
                                'same_as_existing' => $freshUrl === $recording->file_url,
                            ]
                        );
                    }
                }
            }

            // ---------------------------------------------------------
            // 14. Final HTTP failure
            // ---------------------------------------------------------

            if (! $response->successful()) {

                Log::warning(
                    'DownloadCallRecording - FINAL DOWNLOAD FAILURE',
                    [
                        'call_recording_id' => $recording->id,
                        'call_id' => $recording->call_id,
                        'status' => $response->status(),
                        'reason' => $response->reason(),
                        'attempt' => $this->attempts(),
                        'max_tries' => $this->tries,
                        'will_release' => true,
                        'release_seconds' => $this->backoff,
                    ]
                );

                $this->release($this->backoff);

                Log::info(
                    'DownloadCallRecording - Job released for retry',
                    [
                        'call_recording_id' => $recording->id,
                        'release_seconds' => $this->backoff,
                    ]
                );

                return;
            }

            // ---------------------------------------------------------
            // 15. Download successful
            // ---------------------------------------------------------

            $body = $response->body();

            Log::info('DownloadCallRecording - Download successful', [
                'call_recording_id' => $recording->id,
                'call_id' => $recording->call_id,
                'status' => $response->status(),
                'content_type' => $response->header('Content-Type'),
                'size_bytes' => strlen($body),
            ]);

            // ---------------------------------------------------------
            // 16. Resolve format
            // ---------------------------------------------------------

            $contentType = $response->header('Content-Type');
            $sourceUrl = $recording->file_url;

            Log::debug('DownloadCallRecording - Resolving audio format', [
                'call_recording_id' => $recording->id,
                'content_type' => $contentType,
                'url' => $this->sanitizeUrl($sourceUrl),
                'url_extension' => pathinfo(
                    parse_url($sourceUrl, PHP_URL_PATH) ?? '',
                    PATHINFO_EXTENSION
                ),
            ]);

            $format = $this->resolveFormat(
                $contentType,
                $sourceUrl
            );

            Log::info('DownloadCallRecording - Format resolved', [
                'call_recording_id' => $recording->id,
                'format' => $format,
                'content_type' => $contentType,
            ]);

            // ---------------------------------------------------------
            // 17. Resolve clinic segment
            // ---------------------------------------------------------

            $clinicSegment = $recording->call?->clinic_id ?? 'unassigned';

            Log::debug('DownloadCallRecording - Building storage path', [
                'call_recording_id' => $recording->id,
                'call_id' => $recording->call_id,
                'clinic_id' => $recording->call?->clinic_id,
                'clinic_segment' => $clinicSegment,
                'format' => $format,
            ]);

            $path = "call-recordings/{$clinicSegment}/{$recording->call_id}.{$format}";

            Log::info('DownloadCallRecording - Storage path generated', [
                'call_recording_id' => $recording->id,
                'path' => $path,
                'disk' => config('filesystems.default'),
            ]);

            // ---------------------------------------------------------
            // 18. Save file
            // ---------------------------------------------------------

            Log::info('DownloadCallRecording - Writing file to storage', [
                'call_recording_id' => $recording->id,
                'path' => $path,
                'size_bytes' => strlen($body),
                'disk' => config('filesystems.default'),
            ]);

            $storageStartedAt = microtime(true);

            $stored = Storage::put($path, $body);

            $storageDuration = round(
                (microtime(true) - $storageStartedAt) * 1000
            );

            Log::info('DownloadCallRecording - Storage::put completed', [
                'call_recording_id' => $recording->id,
                'path' => $path,
                'stored' => $stored,
                'duration_ms' => $storageDuration,
            ]);

            // ---------------------------------------------------------
            // 19. Verify storage
            // ---------------------------------------------------------

            $existsAfterWrite = Storage::exists($path);

            Log::debug('DownloadCallRecording - Storage verification', [
                'call_recording_id' => $recording->id,
                'path' => $path,
                'exists_after_write' => $existsAfterWrite,
            ]);

            if (! $existsAfterWrite) {
                Log::error(
                    'DownloadCallRecording - FILE NOT FOUND AFTER Storage::put',
                    [
                        'call_recording_id' => $recording->id,
                        'path' => $path,
                    ]
                );
            }

            // ---------------------------------------------------------
            // 20. Update database
            // ---------------------------------------------------------

            $fileSize = strlen($body);

            Log::info('DownloadCallRecording - Updating CallRecording', [
                'call_recording_id' => $recording->id,
                'old_file_path' => $recording->file_path,
                'new_file_path' => $path,
                'old_file_size_bytes' => $recording->file_size_bytes,
                'new_file_size_bytes' => $fileSize,
                'old_format' => $recording->format,
                'new_format' => $format,
            ]);

            $updated = $recording->update([
                'file_path' => $path,
                'file_size_bytes' => $fileSize,
                'format' => $format,
            ]);

            Log::info('DownloadCallRecording - Database update completed', [
                'call_recording_id' => $recording->id,
                'updated' => $updated,
            ]);

            // ---------------------------------------------------------
            // 21. Final state
            // ---------------------------------------------------------

            $recording->refresh();

            Log::debug('DownloadCallRecording - Final recording state', [
                'call_recording_id' => $recording->id,
                'file_path' => $recording->file_path,
                'file_size_bytes' => $recording->file_size_bytes,
                'format' => $recording->format,
                'storage_exists' => Storage::exists($recording->file_path),
            ]);

            // ---------------------------------------------------------
            // 22. END
            // ---------------------------------------------------------

            $totalDuration = round(
                (microtime(true) - $startedAt) * 1000
            );

            Log::info('DownloadCallRecording::handle - SUCCESS / END', [
                'call_recording_id' => $recording->id,
                'call_id' => $recording->call_id,
                'file_path' => $recording->file_path,
                'file_size_bytes' => $recording->file_size_bytes,
                'format' => $recording->format,
                'total_duration_ms' => $totalDuration,
                'attempt' => $this->attempts(),
            ]);

        } catch (Throwable $e) {

            // ---------------------------------------------------------
            // 23. Exception
            // ---------------------------------------------------------

            Log::error('DownloadCallRecording::handle - EXCEPTION', [
                'call_recording_id' => $this->callRecordingId,
                'attempt' => $this->attempts(),

                'exception_class' => get_class($e),
                'exception_message' => $e->getMessage(),
                'exception_code' => $e->getCode(),

                'file' => $e->getFile(),
                'line' => $e->getLine(),

                'trace' => $e->getTraceAsString(),

                'total_duration_ms' => round(
                    (microtime(true) - $startedAt) * 1000
                ),
            ]);

            throw $e;
        }
    }

    /**
     * Fetch a fresh, non-expired recording URL for the call from Vapi API.
     */
    public function refreshRecordingUrl(
        CallRecording $recording
    ): ?string {

        try {
            $service = app(CallService::class);

            return $service->refreshRecordingUrl($recording);
        } catch (Throwable $e) {
            Log::error('DownloadCallRecording::refreshRecordingUrl - EXCEPTION', [
                'call_recording_id' => $recording->id,
                'exception_class' => get_class($e),
                'exception_message' => $e->getMessage(),
                'exception_code' => $e->getCode(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            return null;
        }
    }

    protected function resolveFormat(
        ?string $contentType,
        string $url
    ): string {
        Log::debug('DownloadCallRecording::resolveFormat - START', [
            'content_type' => $contentType,
            'url' => $this->sanitizeUrl($url),
            'url_extension' => pathinfo(
                parse_url($url, PHP_URL_PATH) ?? '',
                PATHINFO_EXTENSION
            ),
        ]);

        $format = match (true) {
            str_contains((string) $contentType, 'mpeg'),
            str_ends_with(
                strtolower(parse_url($url, PHP_URL_PATH) ?? ''),
                '.mp3'
            ) => 'mp3',

            str_contains((string) $contentType, 'ogg'),
            str_ends_with(
                strtolower(parse_url($url, PHP_URL_PATH) ?? ''),
                '.ogg'
            ) => 'ogg',

            default => 'wav',
        };

        Log::debug('DownloadCallRecording::resolveFormat - END', [
            'resolved_format' => $format,
        ]);

        return $format;
    }

    /**
     * Never write the full presigned URL to logs.
     *
     * Example:
     * https://host/file.wav?X-Amz-Algorithm=...&X-Amz-Signature=REDACTED
     */
    protected function sanitizeUrl(?string $url): ?string
    {
        if (! $url) {
            return null;
        }

        $parts = parse_url($url);

        if (! $parts) {
            return '[invalid-url]';
        }

        $scheme = $parts['scheme'] ?? 'https';
        $host = $parts['host'] ?? '';
        $port = isset($parts['port'])
            ? ':'.$parts['port']
            : '';
        $path = $parts['path'] ?? '';

        return "{$scheme}://{$host}{$port}{$path}?[QUERY_REDACTED]";
    }
}
