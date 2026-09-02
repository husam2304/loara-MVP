<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePlanRequest extends FormRequest
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
            'slug' => ['sometimes', 'string', 'max:50', Rule::unique('plan_configurations', 'slug')->ignore($this->route('plan')), 'regex:/^[a-z0-9_-]+$/'],
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'price_monthly' => ['sometimes', 'numeric', 'min:0'],
            'price_yearly' => ['sometimes', 'numeric', 'min:0'],
            'minutes_limit' => ['sometimes', 'integer', 'min:-1'],
            'concurrent_limit' => ['sometimes', 'integer', 'min:-1'],
            'team_member_limit' => ['sometimes', 'integer', 'min:-1'],
            'features' => ['sometimes', 'array'],
            'features.*' => ['string'],
            'stripe_price_monthly' => ['sometimes', 'nullable', 'string', 'max:255'],
            'stripe_price_yearly' => ['sometimes', 'nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
