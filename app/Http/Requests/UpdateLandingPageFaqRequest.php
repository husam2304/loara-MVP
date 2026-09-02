<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLandingPageFaqRequest extends FormRequest
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
            'description' => ['required', 'string', 'max:300'],
            'items' => ['required', 'array', 'min:1', 'max:20'],
            'items.*.question' => ['required', 'string', 'max:200'],
            'items.*.answer' => ['required', 'string', 'max:600'],
        ];
    }
}
