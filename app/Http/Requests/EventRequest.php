<?php

namespace App\Http\Requests;

use App\Models\Organization;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class EventRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->has('primary_action_category_id') && $this->input('primary_action_category_id') === '') {
            $this->merge(['primary_action_category_id' => null]);
        }
    }

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
        $orgId = Organization::forAuthUser($this->user())?->id;

        // dd($this->all());
        $rules = [
            'event_type_id' => 'required|exists:event_types,id',
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
            'primary_action_category_id' => [
                Rule::requiredIf(fn () => $this->organizationMustPickCause()),
                'nullable',
                'integer',
                Rule::exists('primary_action_categories', 'id')->where('is_active', true),
                Rule::exists('org_primary_action_category', 'primary_action_category_id')->where(
                    fn ($q) => $orgId ? $q->where('organization_id', $orgId) : $q->whereRaw('1 = 0')
                ),
            ],
        ];

        // Add poster image validation only for create/update
        if ($this->isMethod('POST') || $this->isMethod('PUT') || $this->isMethod('PATCH')) {
            $rules['poster_image'] = 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048';
        }

        return $rules;
    }

    /**
     * Org-side accounts with at least one Category Grid (Primary Action) must pick one cause for the event.
     */
    protected function organizationMustPickCause(): bool
    {
        $user = $this->user();
        if ($user === null) {
            return false;
        }

        $legacyRole = (string) $user->role;
        $isOrgSide = in_array($legacyRole, ['organization', 'care_alliance', 'organization_pending'], true)
            || $user->hasAnyRole(['organization', 'care_alliance', 'organization_pending']);

        if (! $isOrgSide) {
            return false;
        }

        $org = Organization::forAuthUser($user);
        if ($org === null) {
            return false;
        }

        return $org->primaryActionCategories()->where('is_active', true)->exists();
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'event_type_id.required' => 'Event topic is required.',
            'event_type_id.exists' => 'Selected event topic is invalid.',
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
            'primary_action_category_id.required' => 'Please select a cause (primary action category) for this event.',
            'primary_action_category_id.exists' => 'The selected cause is not valid for your organization.',
        ];
    }
}
