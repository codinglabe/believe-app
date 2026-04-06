<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class OrganizationRegistrationRequest extends FormRequest
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
            'ein' => 'required|string|regex:/^[0-9]{9}$/|unique:organizations,ein',
            'name' => 'required|string|max:255',
            'ico' => 'nullable|string|max:255',
            'street' => 'required|string|max:255',
            'city' => 'required|string|max:100',
            'state' => 'required|string|max:50',
            'zip' => 'required|string|max:20',
            'classification' => 'nullable|string|max:100',
            'ruling' => 'nullable|string|max:50',
            'deductibility' => 'nullable|string|max:50',
            'organization' => 'nullable|string|max:100',
            'status' => 'nullable|string|max:50',
            'tax_period' => 'nullable|string|max:50',
            'filing_req' => 'nullable|string|max:50',
            'ntee_code' => 'nullable|string|max:20',
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:20',
            'contact_name' => 'required|string|max:255',
            'contact_title' => 'required|string|max:100',
            'website' => 'nullable|url|max:255',
            'description' => 'required|string|max:2000',
            'mission' => 'required|string|max:2000',
            'agree_to_terms' => 'required|accepted',
            'has_edited_irs_data' => 'boolean'
        ];
    }

    protected function prepareForValidation()
    {
        $this->merge([
            'ein' => preg_replace('/[^0-9]/', '', $this->ein)
        ]);
    }
}
