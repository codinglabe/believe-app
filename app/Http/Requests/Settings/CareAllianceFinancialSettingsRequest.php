<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CareAllianceFinancialSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->hasRole('care_alliance');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'allocation_method' => ['required', Rule::in(['fixed_percentage', 'proportional_equal', 'weighted_by_donations'])],
            'distribution_frequency' => ['required', Rule::in(['instant', 'weekly', 'monthly', 'quarterly'])],
            'min_payout_dollars' => ['required', 'numeric', 'min:1', 'max:1000000'],
            'management_fee_percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'financial_fixed_member_pool_percent' => [
                Rule::requiredIf(fn () => $this->input('allocation_method') === 'fixed_percentage'),
                'numeric',
                'min:0',
                'max:100',
            ],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($this->input('allocation_method') !== 'fixed_percentage') {
                return;
            }
            $feeBps = (int) round((float) $this->input('management_fee_percent', 0) * 100);
            $poolBps = (int) round((float) $this->input('financial_fixed_member_pool_percent', 0) * 100);
            if (abs($feeBps + $poolBps - 10000) > 25) {
                $validator->errors()->add(
                    'financial_fixed_member_pool_percent',
                    'Member pool percentage plus the management fee must total exactly 100%.',
                );
            }
        });
    }
}
