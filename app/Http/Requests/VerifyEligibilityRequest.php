<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class VerifyEligibilityRequest extends FormRequest
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
            'patient_insurance_id' => ['required', 'integer', Rule::exists('patient_insurance', 'id')->whereIn('patient_id', function ($query) {
                $query->select('id')->from('patients')->where('clinic_id', $this->user()->clinic_id);
            })],
            'provider_id' => ['nullable', 'integer', Rule::exists('providers', 'id')->where('clinic_id', $this->user()->clinic_id)],
            'service_date' => ['required', 'date', 'after_or_equal:today'],
            'service_type_codes' => ['nullable', 'array'],
            'service_type_codes.*' => ['string', 'max:5'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'patient_insurance_id.exists' => 'The selected insurance policy does not exist.',
            'provider_id.exists' => 'The selected provider does not exist.',
            'service_date.after_or_equal' => 'The service date must be today or in the future.',
        ];
    }
}
