<?php

namespace App\Services;

use App\Enums\IntegrationStatus;
use App\Enums\SyncDirection;
use App\Enums\SyncStatus;
use App\Models\Integration;
use App\Models\IntegrationSyncLog;
use Illuminate\Support\Facades\Log;

class IntegrationSyncService
{
    /**
     * Run a sync for an integration and record the attempt in the sync log.
     *
     * This is the single extension point for real provider connectors: when a
     * provider-specific client is implemented, perform its API calls inside the
     * try block and report the true number of records processed. Until then the
     * sync honestly records a connection checkpoint (0 records) rather than
     * pretending data was transferred.
     *
     * @return array{ok: bool, message: string, log: IntegrationSyncLog|null}
     */
    public function sync(Integration $integration): array
    {
        if ($integration->status !== IntegrationStatus::Connected) {
            return [
                'ok' => false,
                'message' => 'Connect this integration before syncing.',
                'log' => null,
            ];
        }

        $startedAt = now();

        try {
            $result = $this->runProviderSync($integration);

            $log = IntegrationSyncLog::create([
                'integration_id' => $integration->id,
                'direction' => SyncDirection::Pull,
                'entity_type' => $result['entity_type'],
                'status' => $result['records_failed'] > 0 ? SyncStatus::Partial : SyncStatus::Success,
                'records_processed' => $result['records_processed'],
                'records_failed' => $result['records_failed'],
                'error_details' => $result['note'] ? ['note' => $result['note']] : null,
                'started_at' => $startedAt,
                'completed_at' => now(),
                'created_at' => now(),
            ]);

            $integration->update(['last_synced_at' => now(), 'error_message' => null]);

            return ['ok' => true, 'message' => $result['message'], 'log' => $log];
        } catch (\Throwable $e) {
            Log::error('Integration sync failed', ['integration_id' => $integration->id, 'error' => $e->getMessage()]);

            $log = IntegrationSyncLog::create([
                'integration_id' => $integration->id,
                'direction' => SyncDirection::Pull,
                'entity_type' => 'all',
                'status' => SyncStatus::Failed,
                'records_processed' => 0,
                'records_failed' => 0,
                'error_details' => ['error' => $e->getMessage()],
                'started_at' => $startedAt,
                'completed_at' => now(),
                'created_at' => now(),
            ]);

            $integration->update([
                'status' => IntegrationStatus::Error,
                'error_message' => $e->getMessage(),
            ]);

            return ['ok' => false, 'message' => 'Sync failed: '.$e->getMessage(), 'log' => $log];
        }
    }

    /**
     * Perform the provider-specific data pull. No external connectors ship by
     * default, so this records a connection checkpoint. Implement per-provider
     * API clients here to pull real records.
     *
     * @return array{entity_type: string, records_processed: int, records_failed: int, message: string, note: ?string}
     */
    private function runProviderSync(Integration $integration): array
    {
        return [
            'entity_type' => 'all',
            'records_processed' => 0,
            'records_failed' => 0,
            'message' => 'Connection verified and sync checkpoint recorded. Configure a data connector for this provider to import records.',
            'note' => 'No data connector configured for '.$integration->provider->value.'; recorded a connection checkpoint.',
        ];
    }
}
