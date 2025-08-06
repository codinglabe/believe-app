<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EventRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        // dd($this->all());
        $rules = [
            'name' => 'required|string|max:255',
            'description' => 'required|string|max:1000',
            'start_date' => 'required|date|after:now',
            'end_date' => 'nullable|date|after:start_date',
            'location' => 'required|string|max:255',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'zip' => 'nullable|string|max:20',
            'status' => 'required|in:upcoming,ongoing,completed,cancelled',
            'max_participants' => 'nullable|integer|min:1',
            'registration_fee' => 'nullable|numeric|min:0',
            'requirements' => 'nullable|string|max:500',
            'contact_info' => 'nullable|string|max:500',
            'birthday' => 'nullable|date',
            'visibility' => 'required|in:public,private',
        ];

        // Add poster image validation only for create/update
        if ($this->isMethod('POST') || $this->isMethod('PUT') || $this->isMethod('PATCH')) {
            $rules['poster_image'] = 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048';
        }

        return $rules;
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Event name is required.',
            'description.required' => 'Event description is required.',
            'start_date.required' => 'Start date is required.',
            'start_date.after' => 'Start date must be in the future.',
            'end_date.after' => 'End date must be after start date.',
            'location.required' => 'Event location is required.',
            'status.required' => 'Event status is required.',
            'status.in' => 'Invalid event status.',
            'max_participants.integer' => 'Maximum participants must be a number.',
            'max_participants.min' => 'Maximum participants must be at least 1.',
            'registration_fee.numeric' => 'Registration fee must be a number.',
            'registration_fee.min' => 'Registration fee cannot be negative.',
            'poster_image.image' => 'Poster must be an image file.',
            'poster_image.mimes' => 'Poster must be a JPEG, PNG, JPG, or GIF file.',
            'poster_image.max' => 'Poster image must be less than 2MB.',
            'birthday.date' => 'Birthday must be a valid date.',
            'visibility.required' => 'Event visibility is required.',
            'visibility.in' => 'Visibility must be either public or private.',
        ];
    }
}
