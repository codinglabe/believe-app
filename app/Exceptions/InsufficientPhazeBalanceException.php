<?php

namespace App\Exceptions;

use Exception;

class InsufficientPhazeBalanceException extends Exception
{
    public function __construct(
        public readonly float $required,
        public readonly float $available,
        string $message = 'Insufficient Phaze prefunded balance for this gift card purchase.',
    ) {
        parent::__construct($message);
    }

    public function userMessage(): string
    {
        return 'Gift card purchases are temporarily unavailable due to provider funding limits. Please try again later or contact support.';
    }
}
