<?php

namespace App\Support;

final class LivestreamParticipantEmails
{
    /**
     * @return list<string>
     */
    public static function fromSettings(?array $settings): array
    {
        if ($settings === null) {
            return [];
        }

        $raw = $settings['participant_emails'] ?? $settings['participantEmails'] ?? [];

        if (! is_array($raw)) {
            return [];
        }

        $emails = array_values(array_unique(array_filter(array_map(
            static fn ($email) => strtolower(trim((string) $email)),
            $raw
        ))));

        return array_values(array_filter($emails, static fn (string $email) => filter_var($email, FILTER_VALIDATE_EMAIL) !== false));
    }
}
