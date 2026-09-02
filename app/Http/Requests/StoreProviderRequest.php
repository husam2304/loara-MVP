<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProviderRequest extends FormRequest
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
        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'title' => ['required', 'string', 'max:10'],
            'specialty' => ['required', 'string', 'max:100'],
            'npi_number' => ['nullable', 'string', 'max:20'],
            'color' => ['required', 'string', 'max:7'],
        ];
    }
}
