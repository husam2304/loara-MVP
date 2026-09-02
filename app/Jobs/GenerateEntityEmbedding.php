<?php

namespace App\Jobs;

use App\Models\AppointmentType;
use App\Models\Provider;
use App\Services\EmbeddingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateEntityEmbedding implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $entityId,
        public string $entityClass
    ) {}

    /**
     * Execute the job.
     */
    public function handle(EmbeddingService $embeddingService): void
    {
        $entity = app($this->entityClass)->find($this->entityId);

        if (!$entity) {
            return;
        }

        $textToEmbed = '';
        if ($entity instanceof Provider) {
            $textToEmbed = "طبيب {$entity->full_name}";
        } elseif ($entity instanceof AppointmentType) {
            $textToEmbed = $entity->name;
        }

        if (empty(trim($textToEmbed))) {
            return;
        }

        $embedding = $embeddingService->getEmbedding($textToEmbed);

        if ($embedding) {
            $entity->embedding = json_encode($embedding);
            $entity->saveQuietly(); // save without triggering events
        } else {
            Log::warning("GenerateEntityEmbedding: Failed to generate embedding for {$this->entityClass} ID {$this->entityId}");
        }
    }
}
