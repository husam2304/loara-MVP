<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StorePlanRequest extends FormRequest
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
            'slug' => ['required', 'string', 'max:50', 'unique:plan_configurations,slug', 'regex:/^[a-z0-9_-]+$/'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            'price_monthly' => ['required', 'numeric', 'min:0'],
            'price_yearly' => ['required', 'numeric', 'min:0'],
            'minutes_limit' => ['required', 'integer', 'min:-1'],
            'concurrent_limit' => ['required', 'integer', 'min:-1'],
            'team_member_limit' => ['required', 'integer', 'min:-1'],
            'features' => ['required', 'array'],
            'features.*' => ['string'],
            'stripe_price_monthly' => ['nullable', 'string', 'max:255'],
            'stripe_price_yearly' => ['nullable', 'string', 'max:255'],
            'is_active' => ['boolean'],
        ];
    }
}
