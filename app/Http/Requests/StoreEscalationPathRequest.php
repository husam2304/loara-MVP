<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEscalationPathRequest extends FormRequest
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
        $clinicId = $this->user()?->clinic_id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'level' => [
                'required',
                'integer',
                'min:1',
                'max:255',
                Rule::unique('escalation_paths', 'level')->where(fn ($query) => $query->where('clinic_id', $clinicId)),
            ],
            'target_role' => ['required', 'string', 'max:30'],
            'timeout_seconds' => ['required', 'integer', 'min:5', 'max:3600'],
        ];
    }
}
