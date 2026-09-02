<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLandingPageShowcaseRequest extends FormRequest
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
            'items.*.title' => ['required', 'string', 'max:80'],
            'items.*.description' => ['required', 'string', 'max:400'],
            'items.*.image' => ['nullable', 'string', 'max:500'],
            'items.*.bullets' => ['nullable', 'array', 'max:6'],
            'items.*.bullets.*' => ['required', 'string', 'max:80'],
        ];
    }
}
