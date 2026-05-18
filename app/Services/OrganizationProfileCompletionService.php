<?php

namespace App\Services;

use App\Models\Organization;

class OrganizationProfileCompletionService
{
    /**
     * Integration checklist for the organization profile nudge banner (dashboard + workspace).
     *
     * @return array{percent: int, completed: int, total: int, missing: array<int, array<string, mixed>>, completeSetupHref: string|null}|null
     */
    public static function forOrganization(?Organization $organization): ?array
    {
        if (! $organization) {
            return null;
        }

        $hasDropbox = ! empty($organization->dropbox_refresh_token) || ! empty($organization->dropbox_access_token);
        $hasYoutube = ! empty($organization->youtube_refresh_token) || ! empty($organization->youtube_access_token);
        $hasEmail = $organization->emailConnections()->where('is_active', true)->exists();
        $socialAccounts = $organization->social_accounts ?? [];
        $hasSocial = is_array($socialAccounts) && collect($socialAccounts)->filter(fn ($v) => is_string($v) && trim($v) !== '')->isNotEmpty();

        $items = [
            [
                'id' => 'email',
                'label' => 'Email Invites',
                'benefit' => 'Community Outreach',
                'route' => '/email-invite',
                'connected' => $hasEmail,
            ],
            [
                'id' => 'social',
                'label' => 'Social Media',
                'benefit' => 'Visibility Hub',
                'route' => route('social-media.index'),
                'connected' => $hasSocial,
            ],
            [
                'id' => 'youtube',
                'label' => 'YouTube',
                'benefit' => 'Broadcast Hub',
                'route' => route('integrations.youtube'),
                'connected' => $hasYoutube,
            ],
            [
                'id' => 'dropbox',
                'label' => 'Dropbox',
                'benefit' => 'Secure AI Vault',
                'route' => route('integrations.dropbox'),
                'connected' => $hasDropbox,
            ],
        ];
        $completed = collect($items)->where('connected', true)->count();
        $total = count($items);
        $percent = $total > 0 ? (int) round(($completed / $total) * 100) : 100;
        $missing = collect($items)->where('connected', false)->values()->all();

        return [
            'percent' => $percent,
            'completed' => $completed,
            'total' => $total,
            'missing' => $missing,
            'completeSetupHref' => $missing[0]['route'] ?? null,
        ];
    }
}
