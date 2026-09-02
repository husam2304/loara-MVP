<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLandingPageWorkflowsRequest extends FormRequest
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
            'booking_flow' => ['required', 'array', 'min:1', 'max:10'],
            'booking_flow.*.type' => ['required', 'string', 'max:20'],
            'booking_flow.*.icon' => ['nullable', 'string', 'max:30'],
            'booking_flow.*.title' => ['nullable', 'string', 'max:50'],
            'booking_flow.*.content' => ['nullable', 'string', 'max:300'],
            'booking_flow.*.top_label' => ['nullable', 'string', 'max:30'],
            'booking_flow.*.text' => ['nullable', 'string', 'max:50'],
            'booking_flow.*.color' => ['nullable', 'string', 'max:10'],
            'triage_flow' => ['required', 'array', 'min:1', 'max:10'],
            'triage_flow.*.type' => ['required', 'string', 'max:20'],
            'triage_flow.*.icon' => ['nullable', 'string', 'max:30'],
            'triage_flow.*.title' => ['nullable', 'string', 'max:50'],
            'triage_flow.*.content' => ['nullable', 'string', 'max:300'],
            'triage_flow.*.top_label' => ['nullable', 'string', 'max:30'],
            'triage_flow.*.text' => ['nullable', 'string', 'max:50'],
            'triage_flow.*.color' => ['nullable', 'string', 'max:10'],
        ];
    }
}
