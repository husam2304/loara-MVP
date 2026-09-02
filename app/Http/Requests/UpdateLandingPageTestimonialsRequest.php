<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLandingPageTestimonialsRequest extends FormRequest
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
            'items' => ['required', 'array', 'min:1', 'max:12'],
            'items.*.quote' => ['required', 'string', 'max:400'],
            'items.*.name' => ['required', 'string', 'max:80'],
            'items.*.role' => ['required', 'string', 'max:100'],
        ];
    }
}
