<?php

namespace App\Http\Requests;

use App\Enums\CallToolName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWorkflowNodeRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:80'],
            'role' => ['nullable', 'string', 'max:30'],
            'system_prompt' => ['nullable', 'string', 'max:5000'],
            'greeting_message' => ['nullable', 'string', 'max:500'],
            'model' => ['required', 'string', Rule::in(['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'])],
            'temperature' => ['required', 'numeric', 'between:0,1'],
            'voice_provider' => ['required', 'string', Rule::in(['vapi', 'elevenlabs', 'azure'])],
            'voice_name' => ['required', 'string', 'max:50'],
            'tool_names' => ['required', 'array'],
            'tool_names.*' => ['required', 'string', Rule::in(array_column(CallToolName::cases(), 'value'))],
        ];
    }
}
