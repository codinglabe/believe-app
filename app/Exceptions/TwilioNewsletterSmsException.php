<?php

namespace App\Exceptions;

use RuntimeException;
use Throwable;

/**
 * Thrown when Twilio SMS fails; includes whether the project is trial or live.
 */
class TwilioNewsletterSmsException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $accountMode,
        public readonly ?int $twilioErrorCode = null,
        ?Throwable $previous = null
    ) {
        parent::__construct($message, 0, $previous);
    }
}
