<?php

namespace App\Services\PushNotifications;

class FcmErrorClassifier
{
    /** @var list<string> */
    private const PERMANENT_TOKEN_CODES = [
        'UNREGISTERED',
        'NOT_FOUND',
        'INVALID_ARGUMENT',
        'INVALID-REGISTRATION-TOKEN',
        'REGISTRATION-TOKEN-NOT-REGISTERED',
        'MESSAGING/INVALID-ARGUMENT',
        'PERMISSION_DENIED',
        'PERMISSION-DENIED',
    ];

    /** @var list<string> */
    private const RETRYABLE_CODES = [
        'UNAVAILABLE',
        'INTERNAL',
        'DEADLINE_EXCEEDED',
        'RESOURCE_EXHAUSTED',
        'EXCEPTION',
        'TIMEOUT',
        'NO_ACCESS_TOKEN',
    ];

    /** @var list<string> */
    private const RETRYABLE_FAILURE_REASONS = [
        'Device not reachable',
        'Firebase rejected payload',
        'Temporary Firebase error',
        'Request timed out',
    ];

    public function normalizeErrorCode(?string $code): string
    {
        $normalized = strtoupper(trim((string) $code));
        $normalized = str_replace([' ', '/'], ['_', '_'], $normalized);

        return match ($normalized) {
            'REGISTRATION_TOKEN_NOT_REGISTERED' => 'UNREGISTERED',
            'INVALID_REGISTRATION_TOKEN' => 'INVALID_ARGUMENT',
            'MESSAGING_INVALID_ARGUMENT' => 'INVALID_ARGUMENT',
            default => $normalized,
        };
    }

    /**
     * @param  array{success?: bool, error_code?: ?string, response?: ?array}  $result
     */
    public function mapFailureReason(array $result): string
    {
        $code = $this->normalizeErrorCode($result['error_code'] ?? null);

        return match (true) {
            $this->isPermanentTokenFailure($code, $result) => 'Invalid device token',
            in_array($code, ['UNAVAILABLE', 'DEADLINE_EXCEEDED'], true) => 'Device not reachable',
            in_array($code, ['INTERNAL', 'RESOURCE_EXHAUSTED'], true) => 'Temporary Firebase error',
            $code === 'EXCEPTION' => 'Request timed out',
            str_contains($code, 'PAYLOAD') || str_contains($code, 'SIZE') => 'Payload too large',
            $code === 'NO_ACCESS_TOKEN' => 'Firebase rejected payload',
            default => is_array($result['response'] ?? null)
                ? (string) ($result['response']['error']['message'] ?? 'Firebase rejected payload')
                : 'Firebase rejected payload',
        };
    }

    /**
     * @param  array{success?: bool, error_code?: ?string, response?: ?array}  $result
     */
    public function isPermanentTokenFailure(string $code, array $result = []): bool
    {
        $normalized = $this->normalizeErrorCode($code);

        if (in_array($normalized, ['UNREGISTERED', 'NOT_FOUND', 'PERMISSION_DENIED'], true)) {
            return true;
        }

        if ($normalized === 'INVALID_ARGUMENT') {
            $message = strtoupper((string) data_get($result, 'response.error.message', ''));

            return str_contains($message, 'TOKEN')
                || str_contains($message, 'REGISTRATION')
                || str_contains($message, 'SENDERID')
                || str_contains($message, 'NOT A VALID');
        }

        return in_array($normalized, self::PERMANENT_TOKEN_CODES, true);
    }

    public function isRetryable(?string $code, ?string $failureReason = null): bool
    {
        $normalized = $this->normalizeErrorCode($code);

        if (in_array($normalized, self::RETRYABLE_CODES, true)) {
            return true;
        }

        return $failureReason !== null
            && in_array($failureReason, self::RETRYABLE_FAILURE_REASONS, true);
    }

    public function isRetryableFailureReason(?string $failureReason): bool
    {
        return $failureReason !== null
            && in_array($failureReason, self::RETRYABLE_FAILURE_REASONS, true);
    }

    public function retryDelaySeconds(int $attempt): int
    {
        return min(3, max(1, $attempt));
    }

    public function maxAttempts(): int
    {
        return 3;
    }
}
