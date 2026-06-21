<?php

namespace App\Exceptions;

use Exception;

class GiftCardRedemptionCapacityReachedException extends Exception
{
    public function __construct(
        public readonly float $required,
        public readonly float $available,
        string $message = 'Gift card redemption capacity reached.',
    ) {
        parent::__construct($message);
    }

    public function userTitle(): string
    {
        return 'Gift Card Redemption Capacity Reached';
    }

    public function userMessage(): string
    {
        return 'We have reached our current gift card redemption capacity. '
            .'Please try again later or send BP as a gift to another supporter.';
    }
}
