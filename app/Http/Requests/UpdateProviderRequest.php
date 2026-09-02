<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProviderRequest extends FormRequest
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
            'first_name' => ['sometimes', 'string', 'max:100'],
            'last_name' => ['sometimes', 'string', 'max:100'],
            'title' => ['sometimes', 'string', 'max:10'],
            'specialty' => ['sometimes', 'string', 'max:100'],
            'npi_number' => ['nullable', 'string', 'max:20'],
            'color' => ['sometimes', 'string', 'max:7'],
            'is_active' => ['sometimes', 'boolean'],
            'schedules' => ['nullable', 'array', 'max:7'],
            'schedules.*.day_of_week' => ['required_with:schedules', 'integer', 'between:0,6'],
            'schedules.*.start_time' => ['required_with:schedules', 'date_format:H:i'],
            'schedules.*.end_time' => ['required_with:schedules', 'date_format:H:i', 'after:schedules.*.start_time'],
            'schedules.*.is_available' => ['required_with:schedules', 'boolean'],
        ];
    }
}
