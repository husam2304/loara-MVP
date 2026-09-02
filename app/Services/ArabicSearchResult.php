<?php

namespace App\Services;

class ArabicSearchResult
{
    public const STATUS_FOUND = 'FOUND';
    public const STATUS_AMBIGUOUS = 'AMBIGUOUS';
    public const STATUS_NOT_FOUND = 'NOT_FOUND';

    public function __construct(
        public string $status,
        public mixed $entity = null,
        public array $ambiguousMatches = [],
        public float $confidence = 0.0
    ) {}
}
