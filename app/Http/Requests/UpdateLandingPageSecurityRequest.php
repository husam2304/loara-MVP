<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLandingPageSecurityRequest extends FormRequest
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
            'items' => ['required', 'array', 'min:1', 'max:8'],
            'items.*.icon' => ['required', 'string', 'max:30'],
            'items.*.title' => ['required', 'string', 'max:60'],
            'items.*.description' => ['required', 'string', 'max:300'],
        ];
    }
}
