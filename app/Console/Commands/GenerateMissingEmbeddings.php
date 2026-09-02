<?php

namespace App\Console\Commands;

use App\Models\AppointmentType;
use App\Models\Provider;
use App\Services\EmbeddingService;
use Illuminate\Console\Command;

class GenerateMissingEmbeddings extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'embeddings:generate {--force : Generate even if already exists}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate embeddings for providers and appointment types';

    /**
     * Execute the console command.
     */
    public function handle(EmbeddingService $embeddingService)
    {
        $force = $this->option('force');

        $this->info('Generating embeddings for Providers...');
        $providers = Provider::when(!$force, fn($q) => $q->whereNull('embedding'))->get();
        $this->withProgressBar($providers, function (Provider $provider) use ($embeddingService) {
            $text = "طبيب {$provider->full_name}";
            $embedding = $embeddingService->getEmbedding($text);
            if ($embedding) {
                $provider->embedding = json_encode($embedding);
                $provider->saveQuietly();
            }
        });
        $this->newLine();

        $this->info('Generating embeddings for Appointment Types...');
        $types = AppointmentType::when(!$force, fn($q) => $q->whereNull('embedding'))->get();
        $this->withProgressBar($types, function (AppointmentType $type) use ($embeddingService) {
            $embedding = $embeddingService->getEmbedding($type->name);
            if ($embedding) {
                $type->embedding = json_encode($embedding);
                $type->saveQuietly();
            }
        });
        $this->newLine();

        $this->info('Done!');
    }
}
