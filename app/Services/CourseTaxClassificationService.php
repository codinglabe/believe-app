<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CourseTaxClassificationService
{
    public const NON_TAXABLE = 'non_taxable';

    public const PARTIAL_TAXABLE = 'partial_taxable';

    public const FULLY_TAXABLE = 'fully_taxable';

    public static function needsIntake(Request $request): bool
    {
        return $request->input('pricing_type') === 'paid';
    }

    /**
     * @return array<string, mixed>
     */
    public static function validationRules(): array
    {
        return [
            'course_delivery_type' => [
                Rule::requiredIf(fn () => self::needsIntake(request())),
                'nullable',
                Rule::in(['online', 'live', 'hybrid']),
            ],
            'course_content_type' => [
                Rule::requiredIf(fn () => self::needsIntake(request()) && request()->input('course_delivery_type') === 'online'),
                'nullable',
                Rule::in(['written_material', 'video_streamed', 'video_streamed_downloadable', 'general']),
            ],
            'has_physical_materials' => [
                Rule::requiredIf(fn () => self::needsIntake(request())),
                'nullable',
                'boolean',
            ],
            'pricing_structure' => [
                Rule::requiredIf(fn () => self::needsIntake(request()) && request()->boolean('has_physical_materials')),
                'nullable',
                Rule::in(['bundled', 'separate']),
            ],
            'requires_shipping' => [
                Rule::requiredIf(fn () => self::needsIntake(request()) && request()->boolean('has_physical_materials')),
                'nullable',
                'boolean',
            ],
            'digital_course_fee' => [
                Rule::requiredIf(fn () => self::needsSplitFeeFields(request())),
                'nullable',
                'numeric',
                'min:0',
            ],
            'materials_fee' => [
                Rule::requiredIf(fn () => self::needsSplitFeeFields(request())),
                'nullable',
                'numeric',
                'min:0',
            ],
            'shipping_fee_amount' => [
                Rule::requiredIf(fn () => self::needsShippingFeeField(request())),
                'nullable',
                'numeric',
                'min:0',
            ],
            // `accepted` must not run for free listings: the form still sends false and validation would fail.
            'tax_ack_outside_ca' => array_merge(
                [
                    Rule::requiredIf(fn () => self::needsIntake(request())),
                    'nullable',
                ],
                self::needsIntake(request()) ? ['accepted'] : [],
            ),
            'tax_ack_auto_calculate' => array_merge(
                [
                    Rule::requiredIf(fn () => self::needsIntake(request())),
                    'nullable',
                ],
                self::needsIntake(request()) ? ['accepted'] : [],
            ),
        ];
    }

    public static function needsSplitFeeFields(Request $request): bool
    {
        if (! self::needsIntake($request)) {
            return false;
        }

        return $request->boolean('has_physical_materials')
            && $request->input('pricing_structure') === 'separate';
    }

    public static function needsShippingFeeField(Request $request): bool
    {
        if (! self::needsIntake($request) || ! $request->boolean('requires_shipping')) {
            return false;
        }

        if (! $request->boolean('has_physical_materials')) {
            return false;
        }

        return in_array($request->input('pricing_structure'), ['separate', 'bundled'], true);
    }

    /**
     * Run after base request validation.
     *
     * @throws ValidationException
     */
    public static function validateFeeBreakdown(Request $request): void
    {
        if (! self::needsIntake($request)) {
            return;
        }

        $courseFee = (float) $request->input('course_fee', 0);
        $hasPhysical = $request->boolean('has_physical_materials');
        $pricingStructure = $request->input('pricing_structure');
        $class = self::classify(true, $hasPhysical, $hasPhysical ? $pricingStructure : null);

        if ($class === self::PARTIAL_TAXABLE) {
            $d = (float) $request->input('digital_course_fee', 0);
            $m = (float) $request->input('materials_fee', 0);
            $ship = $request->boolean('requires_shipping') ? (float) $request->input('shipping_fee_amount', 0) : 0.0;

            if (abs($d + $m + $ship - $courseFee) > 0.009) {
                throw ValidationException::withMessages([
                    'course_fee' => 'Digital, materials, and shipping amounts must equal the total course fee.',
                ]);
            }
        }

        if ($class === self::FULLY_TAXABLE && $request->boolean('requires_shipping')) {
            $ship = (float) $request->input('shipping_fee_amount', 0);
            if ($ship <= 0) {
                throw ValidationException::withMessages([
                    'shipping_fee_amount' => 'Enter a shipping fee when shipping is required.',
                ]);
            }
            if ($courseFee <= $ship) {
                throw ValidationException::withMessages([
                    'course_fee' => 'Total course fee must be greater than the shipping amount.',
                ]);
            }
        }
    }

    public static function classify(
        bool $needsIntake,
        ?bool $hasPhysicalMaterials,
        ?string $pricingStructure,
    ): string {
        if (! $needsIntake) {
            return self::NON_TAXABLE;
        }

        if (! $hasPhysicalMaterials) {
            return self::NON_TAXABLE;
        }

        if ($pricingStructure === 'separate') {
            return self::PARTIAL_TAXABLE;
        }

        if ($pricingStructure === 'bundled') {
            return self::FULLY_TAXABLE;
        }

        return self::NON_TAXABLE;
    }

    /**
     * @return array<string, mixed>
     */
    public static function persistenceFromRequest(Request $request): array
    {
        if (! self::needsIntake($request)) {
            return [
                'course_delivery_type' => null,
                'course_content_type' => null,
                'has_physical_materials' => null,
                'pricing_structure' => null,
                'requires_shipping' => null,
                'digital_course_fee' => null,
                'materials_fee' => null,
                'shipping_fee_amount' => null,
                'tax_ack_outside_ca' => null,
                'tax_ack_auto_calculate' => null,
                'tax_classification' => self::NON_TAXABLE,
            ];
        }

        $hasPhysical = $request->boolean('has_physical_materials');
        $class = self::classify(
            true,
            $hasPhysical,
            $hasPhysical ? $request->input('pricing_structure') : null,
        );

        $contentType = $request->input('course_delivery_type') === 'online'
            ? $request->input('course_content_type')
            : null;

        $digital = null;
        $materials = null;
        $shipping = null;

        if ($class === self::PARTIAL_TAXABLE) {
            $digital = $request->input('digital_course_fee');
            $materials = $request->input('materials_fee');
            $shipping = $request->boolean('requires_shipping') ? $request->input('shipping_fee_amount') : null;
        } elseif ($class === self::FULLY_TAXABLE) {
            $shipping = $request->boolean('requires_shipping') ? $request->input('shipping_fee_amount') : null;
        }

        return [
            'course_delivery_type' => $request->input('course_delivery_type'),
            'course_content_type' => $contentType,
            'has_physical_materials' => $hasPhysical,
            'pricing_structure' => $hasPhysical ? $request->input('pricing_structure') : null,
            'requires_shipping' => $hasPhysical ? $request->boolean('requires_shipping') : null,
            'digital_course_fee' => $digital,
            'materials_fee' => $materials,
            'shipping_fee_amount' => $shipping,
            'tax_ack_outside_ca' => $request->boolean('tax_ack_outside_ca'),
            'tax_ack_auto_calculate' => $request->boolean('tax_ack_auto_calculate'),
            'tax_classification' => $class,
        ];
    }
}
