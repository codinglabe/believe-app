<?php

namespace App\Http\Requests\Settings;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Request;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($this->user()->id),
            ],
            'phone' => ['nullable', 'string'],
            'dob' => ["nullable", 'date'],
        ];

        if ($this->user()->role === 'organization') {
            $rules = array_merge($rules, [
                'contact_title' => ['required', 'string'],
                'website' => ['nullable', 'string', 'url'],
                'wefunder_project_url' => ['nullable', 'string', 'url', 'max:500'],
                'description' => ['required', 'string'],
                'mission' => ['required', 'string'],
                'gift_card_terms_approved' => ['nullable', 'boolean'],
                'primary_action_category_ids' => ['required', 'array', 'min:1'],
                'primary_action_category_ids.*' => ['integer', 'distinct', Rule::exists('primary_action_categories', 'id')->where('is_active', true)],
            ]);
        }

        return $rules;
    }
}
