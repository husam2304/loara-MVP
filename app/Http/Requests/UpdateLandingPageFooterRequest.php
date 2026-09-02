<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLandingPageFooterRequest extends FormRequest
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
            'copyright_text' => ['required', 'string', 'max:100'],
            'social_links' => ['required', 'array', 'min:1', 'max:5'],
            'social_links.*.platform' => ['required', 'string', 'max:20'],
            'social_links.*.url' => ['required', 'string', 'max:255'],
        ];
    }
}
