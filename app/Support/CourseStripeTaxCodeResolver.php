<?php

namespace App\Support;

use App\Models\Course;

/**
 * Maps BIU course intake (delivery + content type) to Stripe product tax codes (txcd_*).
 *
 * @see https://stripe.com/docs/tax/tax-codes
 */
final class CourseStripeTaxCodeResolver
{
    public static function courseProductTaxCode(Course $course): string
    {
        $delivery = $course->course_delivery_type;
        $content = $course->course_content_type;

        if ($delivery === 'live') {
            return (string) config('services.stripe.tax_code_live_virtual_training');
        }

        if ($delivery === 'hybrid') {
            return (string) config('services.stripe.tax_code_self_study_web');
        }

        // 100% online
        if ($delivery === 'online') {
            return match ($content) {
                'written_material' => (string) config('services.stripe.tax_code_on_demand_written'),
                'video_streamed' => (string) config('services.stripe.tax_code_streamed_prerecorded'),
                'video_streamed_downloadable' => (string) config('services.stripe.tax_code_streamed_downloadable'),
                default => (string) config('services.stripe.tax_code_self_study_web'),
            };
        }

        return (string) config('services.stripe.tax_code_self_study_web');
    }

    public static function tangibleGoodsTaxCode(): string
    {
        return (string) config('services.stripe.tax_code_tangible_goods');
    }

    public static function shippingTaxCode(): string
    {
        return (string) config('services.stripe.tax_code_shipping');
    }
}
