<?php

namespace App\Http\Requests\Admin;

use App\Enums\GatewayType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateGatewayConfigurationRequest extends FormRequest
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
            'gateway' => ['required', 'string', Rule::in(array_column(GatewayType::cases(), 'value'))],
            'publishable_key' => ['required', 'string', 'max:255'],
            'secret_key' => ['required', 'string', 'max:255'],
            'webhook_secret' => ['nullable', 'string', 'max:255'],
            'is_active' => ['boolean'],
        ];
    }
}
