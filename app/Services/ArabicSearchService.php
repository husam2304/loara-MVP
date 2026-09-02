<?php

namespace App\Services;

use App\Models\AppointmentType;
use App\Models\Patient;
use App\Models\Provider;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class ArabicSearchService
{
    public function __construct(protected EmbeddingService $embeddingService)
    {
    }

    /**
     * Normalize Arabic text by removing titles, diacritics, and unifying characters.
     */
    public function normalize(?string $text): string
    {
        if (empty($text)) {
            return '';
        }

        // Lowercase for English fallback
        $text = mb_strtolower($text);

        // Remove diacritics (Tashkeel)
        $text = preg_replace('/[\x{0617}-\x{061A}\x{064B}-\x{0652}]/u', '', $text);

        // Remove tatweel
        $text = str_replace('ـ', '', $text);

        // Common titles to remove
        $titles = ['دكتور', 'دكتورة', 'دكتوره', 'د.', 'طبيب', 'طبيبة', 'الدكتور', 'الطبيب', 'مهندس', 'أستاذ', 'البروفيسور', 'بروفيسور'];
        foreach ($titles as $title) {
            $text = preg_replace('/\b' . preg_quote($title, '/') . '\b/u', '', $text);
        }

        // Unify Alef
        $text = preg_replace('/[أإآ]/u', 'ا', $text);
        
        // Unify Ya'a and Alef Maksoura
        $text = preg_replace('/[ىي]/u', 'ي', $text);

        // Clean up extra spaces
        $text = trim(preg_replace('/\s+/u', ' ', $text));

        return $text;
    }

    public function searchProvider(string $query, int $clinicId): ArabicSearchResult
    {
        $normalizedQuery = $this->normalize($query);
        
        if (empty($normalizedQuery)) {
            return new ArabicSearchResult(ArabicSearchResult::STATUS_NOT_FOUND);
        }

        $providers = Provider::where('clinic_id', $clinicId)->where('is_active', true)->get();

        // 1. Exact Match
        $exactMatches = $providers->filter(function ($provider) use ($normalizedQuery) {
            return $this->normalize($provider->full_name) === $normalizedQuery
                || $this->normalize($provider->first_name) === $normalizedQuery
                || $this->normalize($provider->last_name) === $normalizedQuery;
        });

        if ($exactMatches->count() === 1) {
            return new ArabicSearchResult(ArabicSearchResult::STATUS_FOUND, $exactMatches->first(), [], 1.0);
        }
        if ($exactMatches->count() > 1) {
            return new ArabicSearchResult(ArabicSearchResult::STATUS_AMBIGUOUS, null, $exactMatches->values()->toArray(), 1.0);
        }

        // 2. LIKE / Contains Match
        $likeMatches = $providers->filter(function ($provider) use ($normalizedQuery) {
            $fullName = $this->normalize($provider->full_name);
            return str_contains($fullName, $normalizedQuery) || str_contains($normalizedQuery, $fullName);
        });

        if ($likeMatches->count() === 1) {
            return new ArabicSearchResult(ArabicSearchResult::STATUS_FOUND, $likeMatches->first(), [], 0.9);
        }
        if ($likeMatches->count() > 1) {
            return new ArabicSearchResult(ArabicSearchResult::STATUS_AMBIGUOUS, null, $likeMatches->values()->toArray(), 0.9);
        }

        // 3. Fuzzy Match
        $fuzzyResults = $this->fuzzySearch($providers, $normalizedQuery, 'full_name');
        if (count($fuzzyResults) > 0) {
            return $this->processRankedResults($fuzzyResults);
        }

        // 4. Embedding Fallback
        return $this->embeddingFallback($providers, $query, 'full_name');
    }

    public function searchAppointmentType(string $query, int $clinicId): ArabicSearchResult
    {
        $normalizedQuery = $this->normalize($query);
        
        if (empty($normalizedQuery)) {
            return new ArabicSearchResult(ArabicSearchResult::STATUS_NOT_FOUND);
        }

        $types = AppointmentType::where('clinic_id', $clinicId)->where('is_active', true)->get();

        // 1. Exact Match
        $exactMatches = $types->filter(function ($type) use ($normalizedQuery) {
            return $this->normalize($type->name) === $normalizedQuery;
        });

        if ($exactMatches->count() === 1) {
            return new ArabicSearchResult(ArabicSearchResult::STATUS_FOUND, $exactMatches->first(), [], 1.0);
        }
        if ($exactMatches->count() > 1) {
            return new ArabicSearchResult(ArabicSearchResult::STATUS_AMBIGUOUS, null, $exactMatches->values()->toArray(), 1.0);
        }

        // 2. LIKE / Contains Match
        $likeMatches = $types->filter(function ($type) use ($normalizedQuery) {
            $name = $this->normalize($type->name);
            return str_contains($name, $normalizedQuery) || str_contains($normalizedQuery, $name);
        });

        if ($likeMatches->count() === 1) {
            return new ArabicSearchResult(ArabicSearchResult::STATUS_FOUND, $likeMatches->first(), [], 0.9);
        }
        if ($likeMatches->count() > 1) {
            return new ArabicSearchResult(ArabicSearchResult::STATUS_AMBIGUOUS, null, $likeMatches->values()->toArray(), 0.9);
        }

        // 3. Fuzzy Match
        $fuzzyResults = $this->fuzzySearch($types, $normalizedQuery, 'name');
        if (count($fuzzyResults) > 0) {
            return $this->processRankedResults($fuzzyResults);
        }

        // 4. Embedding Fallback
        return $this->embeddingFallback($types, $query, 'name');
    }

    public function searchPatient(string $nameQuery, int $clinicId, ?string $phone = null): ArabicSearchResult
    {
        $normalizedQuery = $this->normalize($nameQuery);
        $query = Patient::where('clinic_id', $clinicId);
        
        if (!empty($phone)) {
            $digits = preg_replace('/\D/', '', $phone);
            $last10 = strlen($digits) >= 10 ? substr($digits, -10) : $digits;
            $query->whereRaw("REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') LIKE ?", ["%{$last10}%"]);
            
            $patients = $query->get();
            if ($patients->count() === 1) {
                return new ArabicSearchResult(ArabicSearchResult::STATUS_FOUND, $patients->first(), [], 1.0);
            }
            if ($patients->count() > 1 && !empty($normalizedQuery)) {
                // Filter by name if phone matches multiple
                $exactMatches = $patients->filter(fn($p) => $this->normalize($p->full_name) === $normalizedQuery);
                if ($exactMatches->count() === 1) {
                    return new ArabicSearchResult(ArabicSearchResult::STATUS_FOUND, $exactMatches->first(), [], 1.0);
                }
                return new ArabicSearchResult(ArabicSearchResult::STATUS_AMBIGUOUS, null, $patients->values()->all(), 0.9);
            }
            if ($patients->count() > 1) {
                return new ArabicSearchResult(ArabicSearchResult::STATUS_AMBIGUOUS, null, $patients->values()->all(), 0.9);
            }
        }

        if (empty($normalizedQuery)) {
            return new ArabicSearchResult(ArabicSearchResult::STATUS_NOT_FOUND);
        }

        // No phone match or no phone provided, search by name
        $patients = Patient::where('clinic_id', $clinicId)->get();
        
        $exactMatches = $patients->filter(fn($p) => $this->normalize($p->full_name) === $normalizedQuery);
        if ($exactMatches->count() === 1) {
            return new ArabicSearchResult(ArabicSearchResult::STATUS_FOUND, $exactMatches->first(), [], 1.0);
        }
        if ($exactMatches->count() > 1) {
            return new ArabicSearchResult(ArabicSearchResult::STATUS_AMBIGUOUS, null, $exactMatches->values()->all(), 1.0);
        }

        $fuzzyResults = $this->fuzzySearch($patients, $normalizedQuery, 'full_name');
        if (count($fuzzyResults) > 0) {
            return $this->processRankedResults($fuzzyResults, 80.0); // Higher threshold for patients
        }

        // No embeddings for patients, return not found
        return new ArabicSearchResult(ArabicSearchResult::STATUS_NOT_FOUND);
    }

    protected function fuzzySearch(Collection $candidates, string $normalizedQuery, string $field): array
    {
        $matches = [];
        foreach ($candidates as $candidate) {
            $candidateName = $this->normalize($candidate->{$field});
            similar_text($normalizedQuery, $candidateName, $score);
            
            if ($score >= 70.0) {
                $matches[] = [
                    'entity' => $candidate,
                    'score' => $score / 100.0 // Normalize to 0-1
                ];
            }
        }
        usort($matches, fn($a, $b) => $b['score'] <=> $a['score']);
        return $matches;
    }

    protected function embeddingFallback(Collection $candidates, string $rawQuery, string $field): ArabicSearchResult
    {
        // Filter out candidates that don't have embeddings
        $candidatesWithEmbeddings = $candidates->filter(fn($c) => !empty($c->embedding));
        if ($candidatesWithEmbeddings->isEmpty()) {
            return new ArabicSearchResult(ArabicSearchResult::STATUS_NOT_FOUND);
        }

        $queryVector = $this->embeddingService->getEmbedding($rawQuery);
        if (!$queryVector) {
            return new ArabicSearchResult(ArabicSearchResult::STATUS_NOT_FOUND);
        }

        $matches = [];
        foreach ($candidatesWithEmbeddings as $candidate) {
            $vector = is_string($candidate->embedding) ? json_decode($candidate->embedding, true) : $candidate->embedding;
            if (is_array($vector)) {
                $score = $this->cosineSimilarity($queryVector, $vector);
                if ($score >= 0.75) { // Threshold for embedding match
                    $matches[] = [
                        'entity' => $candidate,
                        'score' => $score
                    ];
                }
            }
        }
        
        usort($matches, fn($a, $b) => $b['score'] <=> $a['score']);
        if (count($matches) > 0) {
            return $this->processRankedResults($matches, 0.75, 0.05); // 0.05 margin for ambiguity
        }

        return new ArabicSearchResult(ArabicSearchResult::STATUS_NOT_FOUND);
    }

    protected function processRankedResults(array $matches, float $minScore = 0.0, float $ambiguityMargin = 0.03): ArabicSearchResult
    {
        $matches = array_filter($matches, fn($m) => $m['score'] >= $minScore);
        if (empty($matches)) {
            return new ArabicSearchResult(ArabicSearchResult::STATUS_NOT_FOUND);
        }

        $topMatch = $matches[0];
        
        if (count($matches) > 1) {
            $secondMatch = $matches[1];
            if (($topMatch['score'] - $secondMatch['score']) <= $ambiguityMargin) {
                // Ambiguous
                $ambiguousEntities = array_map(fn($m) => $m['entity'], array_filter($matches, fn($m) => ($topMatch['score'] - $m['score']) <= $ambiguityMargin));
                return new ArabicSearchResult(ArabicSearchResult::STATUS_AMBIGUOUS, null, $ambiguousEntities, $topMatch['score']);
            }
        }

        return new ArabicSearchResult(ArabicSearchResult::STATUS_FOUND, $topMatch['entity'], [], $topMatch['score']);
    }

    protected function cosineSimilarity(array $vec1, array $vec2): float
    {
        $dotProduct = 0;
        $normA = 0;
        $normB = 0;
        $len = min(count($vec1), count($vec2));
        
        for ($i = 0; $i < $len; $i++) {
            $dotProduct += $vec1[$i] * $vec2[$i];
            $normA += $vec1[$i] * $vec1[$i];
            $normB += $vec2[$i] * $vec2[$i];
        }
        
        if ($normA == 0 || $normB == 0) {
            return 0.0;
        }
        
        return $dotProduct / (sqrt($normA) * sqrt($normB));
    }
}
