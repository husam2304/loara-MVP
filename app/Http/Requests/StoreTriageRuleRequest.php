<?php

namespace App\Http\Requests;

use App\Enums\KeywordCategory;
use App\Enums\TriageAction;
use App\Enums\TriagePriority;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTriageRuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $clinicId = $this->user()?->clinic_id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'priority' => ['required', Rule::enum(TriagePriority::class)],
            'action' => ['required', Rule::enum(TriageAction::class)],
            'target_role' => ['nullable', 'string', 'max:30'],
            'target_user_id' => [
                'nullable',
                'integer',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('clinic_id', $clinicId)),
            ],
            'keywords' => ['nullable', 'array', 'max:20'],
            'keywords.*.keyword' => ['required_with:keywords', 'string', 'max:100'],
            'keywords.*.category' => ['required_with:keywords', Rule::enum(KeywordCategory::class)],
            // Optional declarative condition groups on top of the plain
            // keyword list — see TriageMatchEngine for how these combine.
            'all_keywords' => ['nullable', 'array', 'max:20'],
            'all_keywords.*' => ['string', 'max:100'],
            'exclude_keywords' => ['nullable', 'array', 'max:20'],
            'exclude_keywords.*' => ['string', 'max:100'],
            'min_keyword_matches' => ['nullable', 'integer', 'min:1', 'max:20'],
        ];
    }
}
