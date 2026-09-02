<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLandingPageHowItWorksRequest extends FormRequest
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
            'label' => ['required', 'string', 'max:50'],
            'heading' => ['required', 'string', 'max:100'],
            'steps' => ['required', 'array', 'min:1', 'max:6'],
            'steps.*.number' => ['required', 'string', 'max:5'],
            'steps.*.icon' => ['required', 'string', 'max:30'],
            'steps.*.title' => ['required', 'string', 'max:50'],
            'steps.*.description' => ['required', 'string', 'max:300'],
        ];
    }
}
