<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class EINLookupRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'ein' => [
                'required',
                'string',
                'regex:/^[0-9]{9}$/',
            ]
        ];
    }

    public function messages()
    {
        return [
            'ein.required' => 'EIN is required.',
            'ein.regex' => 'EIN must be exactly 9 digits.',
        ];
    }

    protected function prepareForValidation()
    {
        $this->merge([
            'ein' => preg_replace('/[^0-9]/', '', $this->ein)
        ]);
    }
}
