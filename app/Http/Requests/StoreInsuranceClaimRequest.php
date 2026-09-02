<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInsuranceClaimRequest extends FormRequest
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
            'patient_id' => ['required', 'integer', Rule::exists('patients', 'id')->where('clinic_id', $this->user()->clinic_id)],
            'insurance_provider_id' => ['required', 'integer', Rule::exists('insurance_providers', 'id')->where('clinic_id', $this->user()->clinic_id)],
            'claim_number' => ['required', 'string', 'max:50', 'unique:insurance_claims,claim_number'],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:999999.99'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'patient_id.exists' => 'The selected patient does not exist.',
            'insurance_provider_id.exists' => 'The selected insurance provider does not exist.',
            'claim_number.unique' => 'This claim number is already in use.',
            'amount.min' => 'The claim amount must be at least $0.01.',
        ];
    }
}
