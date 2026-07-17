<?php

namespace App\Enums;

enum GiftCardStatus: string
{
    case PendingFulfillment = 'pending_fulfillment';
    case Processing = 'processing';
    case Completed = 'completed';
    case CapacityReached = 'capacity_reached';
    case Failed = 'failed';

    /** @deprecated Legacy fulfilled status — treat as {@see Completed}. */
    case Active = 'active';

    /** Legacy initial default — rarely used post-purchase. */
    case Pending = 'pending';

    case Inactive = 'inactive';

    public function label(): string
    {
        return match ($this) {
            self::PendingFulfillment => 'Pending Fulfillment',
            self::Processing => 'Processing',
            self::Completed => 'Completed',
            self::CapacityReached => 'Capacity Reached',
            self::Failed => 'Failed',
            self::Active => 'Completed',
            self::Pending => 'Pending',
            self::Inactive => 'Inactive',
        };
    }

    public static function tryFromValue(?string $value): ?self
    {
        if ($value === null || $value === '') {
            return null;
        }

        return self::tryFrom($value);
    }

    public static function isFulfilled(?string $status): bool
    {
        return in_array($status, [self::Completed->value, self::Active->value], true);
    }

    public static function isRetryEligible(?string $status): bool
    {
        return in_array($status, [self::Failed->value, self::CapacityReached->value], true);
    }

    /**
     * Admin may skip the delay queue and fulfill immediately.
     * Processing is included so a stuck lock can be forced through.
     */
    public static function isForceFulfillEligible(?string $status): bool
    {
        return in_array($status, [
            self::PendingFulfillment->value,
            self::Processing->value,
        ], true);
    }

    public static function isAwaitingFulfillment(?string $status): bool
    {
        return $status === self::PendingFulfillment->value;
    }

    /**
     * @return list<string>
     */
    public static function adminQueueStatuses(): array
    {
        return [
            self::PendingFulfillment->value,
            self::Processing->value,
            self::Completed->value,
            self::Failed->value,
            self::CapacityReached->value,
        ];
    }
}
