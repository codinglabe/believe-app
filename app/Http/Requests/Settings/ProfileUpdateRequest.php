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
                'description' => ['required', 'string'],
                'mission' => ['required', 'string'],
            ]);
        }

        return $rules;
    }
}
