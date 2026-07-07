<?php

namespace App\Support;

use App\Models\Course;
use Illuminate\Validation\Rule;

/**
 * Host-selected enrollment billing for Connection Hub listings (one-time vs monthly).
 */
final class EnrollmentBillingCycle
{
    public const ONE_TIME = 'one_time';

    public const MONTHLY = 'monthly';

    /** @var list<string> */
    public const VALUES = [
        self::ONE_TIME,
        self::MONTHLY,
    ];

    /** Meetups and Companion hosts may choose monthly billing when the listing is paid. */
    public static function hostCanChoose(string $hubType): bool
    {
        return ConnectionHubType::allowsOpenEnrollmentAfterStart($hubType);
    }

    /** @return array<int, mixed> */
    public static function validationRule(string $hubType, string $pricingType): array
    {
        if ($pricingType === 'free' || ! self::hostCanChoose($hubType)) {
            return ['nullable', Rule::in(self::VALUES)];
        }

        return ['required', Rule::in(self::VALUES)];
    }

    public static function persisted(string $hubType, string $pricingType, mixed $input): string
    {
        if ($pricingType === 'free' || ! self::hostCanChoose($hubType)) {
            return self::ONE_TIME;
        }

        $value = is_string($input) ? strtolower(trim($input)) : '';

        return in_array($value, self::VALUES, true) ? $value : self::ONE_TIME;
    }

    public static function usesSubscription(Course $course): bool
    {
        if (($course->pricing_type ?? '') !== 'paid') {
            return false;
        }

        if (! self::hostCanChoose((string) ($course->type ?? ''))) {
            return false;
        }

        return ($course->enrollment_billing_cycle ?? self::ONE_TIME) === self::MONTHLY;
    }

    public static function label(string $cycle): string
    {
        return match ($cycle) {
            self::MONTHLY => 'Monthly',
            default => 'One-time',
        };
    }
}
