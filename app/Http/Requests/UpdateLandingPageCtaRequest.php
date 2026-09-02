<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLandingPageCtaRequest extends FormRequest
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
            'headline' => ['required', 'string', 'max:100'],
            'description' => ['required', 'string', 'max:300'],
            'primary_button_text' => ['required', 'string', 'max:30'],
            'secondary_button_text' => ['required', 'string', 'max:30'],
        ];
    }
}
