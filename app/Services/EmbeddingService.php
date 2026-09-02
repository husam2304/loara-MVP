<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EmbeddingService
{
    public function getEmbedding(string $text, string $model = 'text-embedding-3-small'): ?array
    {
        $apiKey = config('services.openai.api_key') ?? env('OPENAI_API_KEY');

        if (empty($apiKey)) {
            Log::warning('EmbeddingService: OPENAI_API_KEY is not set.');
            return null;
        }

        try {
            $response = Http::withToken($apiKey)
                ->timeout(10)
                ->post('https://api.openai.com/v1/embeddings', [
                    'model' => $model,
                    'input' => $text,
                ]);

            if ($response->successful()) {
                $data = $response->json();
                if (isset($data['data'][0]['embedding'])) {
                    return $data['data'][0]['embedding'];
                }
            } else {
                Log::error('EmbeddingService: OpenAI API error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('EmbeddingService: Request failed', ['error' => $e->getMessage()]);
        }

        return null;
    }
}
