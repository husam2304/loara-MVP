<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLandingPageHeroRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'badge_text' => ['required', 'string', 'max:50'],
            'headline_line1' => ['required', 'string', 'max:100'],
            'headline_line2' => ['required', 'string', 'max:100'],
            'highlight_word' => ['required', 'string', 'max:30'],
            'description' => ['required', 'string', 'max:500'],
            'primary_cta_text' => ['required', 'string', 'max:30'],
            'secondary_cta_text' => ['required', 'string', 'max:30'],
            'voice_demo_enabled' => ['required', 'boolean'],
            'voice_demo_text' => ['required', 'string', 'max:40'],
            'trust_badges' => ['required', 'array', 'min:1', 'max:5'],
            'trust_badges.*.icon' => ['required', 'string', 'max:30'],
            'trust_badges.*.text' => ['required', 'string', 'max:50'],
        ];
    }
}
