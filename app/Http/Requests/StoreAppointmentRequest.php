<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAppointmentRequest extends FormRequest
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
        $clinicId = $this->user()->clinic_id;

        return [
            'patient_id' => ['required', 'integer', Rule::exists('patients', 'id')->where('clinic_id', $clinicId)],
            'provider_id' => ['required', 'integer', Rule::exists('providers', 'id')->where('clinic_id', $clinicId)],
            'appointment_type_id' => ['required', 'integer', Rule::exists('appointment_types', 'id')->where('clinic_id', $clinicId)],
            'scheduled_at' => ['required', 'date', 'after:now'],
            'room' => ['nullable', 'string', 'max:20'],
            'reason' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'scheduled_at.after' => 'The appointment must be scheduled in the future.',
            'patient_id.exists' => 'The selected patient does not exist.',
            'provider_id.exists' => 'The selected provider does not exist.',
            'appointment_type_id.exists' => 'The selected appointment type does not exist.',
        ];
    }
}
