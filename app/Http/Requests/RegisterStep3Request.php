<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterStep3Request extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'plan' => ['required', 'string', 'exists:plan_configurations,slug'],
            'billing_cycle' => ['required', 'string', 'in:monthly,yearly'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'plan.exists' => 'Please select a valid plan.',
            'billing_cycle.in' => 'Please select a valid billing cycle.',
        ];
    }
}
