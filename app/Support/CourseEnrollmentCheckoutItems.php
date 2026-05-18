<?php

namespace App\Support;

use App\Models\Course;
use App\Models\User;
use App\Services\CourseTaxClassificationService;

/**
 * Builds Stripe Checkout line_items for paid course enrollment with Stripe Tax codes
 * derived from {@see Course::$tax_classification}, delivery/content type, and fee breakdown.
 */
final class CourseEnrollmentCheckoutItems
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public static function lineItems(Course $course, User $user): array
    {
        $currency = strtolower($user->preferredCurrency());
        $rail = 'card';
        $classification = $course->tax_classification ?? CourseTaxClassificationService::NON_TAXABLE;

        $courseCode = CourseStripeTaxCodeResolver::courseProductTaxCode($course);
        $physicalCode = CourseStripeTaxCodeResolver::tangibleGoodsTaxCode();
        $shippingCode = CourseStripeTaxCodeResolver::shippingTaxCode();

        if ($classification === CourseTaxClassificationService::PARTIAL_TAXABLE) {
            return self::partialTaxableLines($course, $currency, $courseCode, $physicalCode, $shippingCode, $rail);
        }

        if ($classification === CourseTaxClassificationService::FULLY_TAXABLE) {
            return self::fullyTaxableLines($course, $currency, $physicalCode, $shippingCode, $rail);
        }

        $fee = (float) $course->course_fee;
        $totalCents = StripeCustomerChargeAmount::chargeCentsFromNetUsd($fee, $rail);

        return [self::line($currency, $totalCents, 'Enrollment: '.$course->name, $courseCode)];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private static function partialTaxableLines(
        Course $course,
        string $currency,
        string $courseCode,
        string $physicalCode,
        string $shippingCode,
        string $rail,
    ): array {
        $digitalUsd = $course->digital_course_fee;
        $materialsUsd = $course->materials_fee;
        $shipUsd = ($course->requires_shipping && $course->shipping_fee_amount !== null)
            ? (float) $course->shipping_fee_amount
            : 0.0;

        if ($digitalUsd !== null && $materialsUsd !== null) {
            $parts = [(float) $digitalUsd, (float) $materialsUsd];
            if ($shipUsd > 0) {
                $parts[] = $shipUsd;
            }
            $totalNet = array_sum($parts);
            if ($totalNet > 0) {
                $totalCents = StripeCustomerChargeAmount::chargeCentsFromNetUsd($totalNet, $rail);
                $centsParts = self::allocateCentsProportionally($totalCents, $parts);

                $lines = [
                    self::line($currency, $centsParts[0], 'Course access: '.$course->name, $courseCode),
                    self::line($currency, $centsParts[1], 'Course materials: '.$course->name, $physicalCode),
                ];
                if (count($centsParts) === 3) {
                    $lines[] = self::line($currency, $centsParts[2], 'Shipping: '.$course->name, $shippingCode);
                }

                return $lines;
            }
        }

        return self::partialTaxableLinesLegacyRatio($course, $currency, $courseCode, $physicalCode, $rail);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private static function partialTaxableLinesLegacyRatio(
        Course $course,
        string $currency,
        string $courseCode,
        string $physicalCode,
        string $rail,
    ): array {
        $fee = (float) $course->course_fee;
        $ratio = (float) config('services.stripe.course_partial_materials_ratio', 0.35);
        $ratio = max(0.01, min(0.99, $ratio));
        $totalCents = StripeCustomerChargeAmount::chargeCentsFromNetUsd($fee, $rail);
        $materialsCents = (int) round($totalCents * $ratio);
        $digitalCents = $totalCents - $materialsCents;

        return [
            self::line($currency, $digitalCents, 'Course access: '.$course->name, $courseCode),
            self::line($currency, $materialsCents, 'Course materials: '.$course->name, $physicalCode),
        ];
    }

    /**
     * Bundled physical + optional shipping line.
     *
     * @return array<int, array<string, mixed>>
     */
    private static function fullyTaxableLines(
        Course $course,
        string $currency,
        string $physicalCode,
        string $shippingCode,
        string $rail,
    ): array {
        $fee = (float) $course->course_fee;
        $shipUsd = ($course->requires_shipping && $course->shipping_fee_amount !== null)
            ? (float) $course->shipping_fee_amount
            : 0.0;

        if ($shipUsd > 0 && $fee > $shipUsd) {
            $bundleUsd = $fee - $shipUsd;
            $totalCents = StripeCustomerChargeAmount::chargeCentsFromNetUsd($fee, $rail);
            $centsParts = self::allocateCentsProportionally($totalCents, [$bundleUsd, $shipUsd]);

            return [
                self::line($currency, $centsParts[0], 'Course & materials: '.$course->name, $physicalCode),
                self::line($currency, $centsParts[1], 'Shipping: '.$course->name, $shippingCode),
            ];
        }

        $totalCents = StripeCustomerChargeAmount::chargeCentsFromNetUsd($fee, $rail);

        return [self::line($currency, $totalCents, 'Enrollment: '.$course->name, $physicalCode)];
    }

    /**
     * @param  array<float>  $partAmountsUsd
     * @return array<int, int>
     */
    private static function allocateCentsProportionally(int $totalCents, array $partAmountsUsd): array
    {
        $sum = array_sum($partAmountsUsd);
        $n = count($partAmountsUsd);
        if ($sum <= 0 || $n === 0) {
            return array_fill(0, $n, 0);
        }

        $out = [];
        $allocated = 0;
        for ($i = 0; $i < $n - 1; $i++) {
            $c = (int) floor($totalCents * ($partAmountsUsd[$i] / $sum));
            $out[] = $c;
            $allocated += $c;
        }
        $out[] = $totalCents - $allocated;

        return $out;
    }

    /**
     * Metadata for Stripe session + local transaction meta (string values only for Stripe).
     *
     * @return array<string, string>
     */
    public static function stripeMetadataSlice(Course $course): array
    {
        $classification = $course->tax_classification ?? CourseTaxClassificationService::NON_TAXABLE;

        $out = [
            'tax_classification' => $classification,
            'stripe_course_tax_code' => CourseStripeTaxCodeResolver::courseProductTaxCode($course),
        ];

        if ($classification === CourseTaxClassificationService::PARTIAL_TAXABLE) {
            $out['partial_materials_ratio'] = (string) config('services.stripe.course_partial_materials_ratio', 0.35);
            if ($course->digital_course_fee !== null && $course->materials_fee !== null) {
                $out['fee_split'] = 'explicit';
            }
        }

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    private static function line(string $currency, int $unitAmountCents, string $name, string $taxCode): array
    {
        return [
            'price_data' => [
                'currency' => $currency,
                'product_data' => [
                    'name' => $name,
                    'tax_code' => $taxCode,
                ],
                'unit_amount' => $unitAmountCents,
                'tax_behavior' => 'exclusive',
            ],
            'quantity' => 1,
        ];
    }
}
