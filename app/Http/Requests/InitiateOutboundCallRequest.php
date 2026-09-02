<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class InitiateOutboundCallRequest extends FormRequest
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
            'mode' => ['required', 'string', 'in:single,batch'],
            'phone_number' => ['required_if:mode,single', 'nullable', 'string', 'regex:/^\+[1-9]\d{1,14}$/'],
            'name' => ['nullable', 'string', 'max:100'],
            'phone_numbers' => ['required_if:mode,batch', 'nullable', 'array', 'min:1', 'max:50'],
            'phone_numbers.*' => ['required', 'string', 'regex:/^\+[1-9]\d{1,14}$/'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'phone_number.regex' => 'Phone number must be in E.164 format (e.g., +14155551234).',
            'phone_numbers.*.regex' => 'Each phone number must be in E.164 format (e.g., +14155551234).',
            'phone_numbers.max' => 'You can call a maximum of 50 numbers at once.',
        ];
    }
}
