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
        return [
            'name' => ['required', 'string', 'max:255'],
            'contact_title' => [
                Rule::requiredIf(fn() => $this->user()->role === 'organization'),
                'string'
            ],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($this->user()->id),
            ],
            'phone' => ['nullable', 'string'],
            'website' => ["nullable", 'string'],
            'description' => [Rule::requiredIf(fn() => $this->user()->role === 'organization')],
            'mission' => [Rule::requiredIf(fn() => $this->user()->role === 'organization')],
        ];
    }
}
