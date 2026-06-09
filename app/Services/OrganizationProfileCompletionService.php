<?php

namespace App\Services;

use App\Models\Organization;

class OrganizationProfileCompletionService
{
    /**
     * Required onboarding checklist for the organization profile banner (dashboard).
     *
     * @return array{percent: int, completed: int, total: int, missing: array<int, array<string, mixed>>, completeSetupHref: string|null, items?: array<int, array<string, mixed>>}|null
     */
    public static function forOrganization(?Organization $organization): ?array
    {
        if (! $organization) {
            return null;
        }

        return app(OrganizationOnboardingService::class)->profileCompletionForOrganization($organization);
    }
}
