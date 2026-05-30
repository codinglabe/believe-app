<?php

namespace App\Support;

final class DonateWidgetEmbed
{
    public static function iframeCode(string $slug, ?string $baseUrl = null): string
    {
        $base = rtrim($baseUrl ?? (string) config('app.url'), '/');
        $src = $base.'/'.ltrim($slug, '/');

        return <<<HTML
<iframe src="{$src}"
        width="100%" height="620" frameborder="0"
        style="max-width:980px;border:0;border-radius:16px;"
        title="Donate with BelieveCash"></iframe>
HTML;
    }

    /**
     * @return array{available: bool, slug: string|null, embedUrl: string|null, iframeCode: string|null}
     */
    public static function payloadForUser(?\App\Models\User $user): array
    {
        $empty = [
            'available' => false,
            'slug' => null,
            'embedUrl' => null,
            'iframeCode' => null,
        ];

        if ($user === null || $user->role !== 'organization') {
            return $empty;
        }

        $slug = trim((string) ($user->slug ?? ''));
        $organization = $user->organization;
        $approved = $organization !== null && $organization->registration_status === 'approved';

        if (! $approved || $slug === '') {
            return [
                ...$empty,
                'slug' => $slug !== '' ? $slug : null,
            ];
        }

        $baseUrl = rtrim((string) config('app.url'), '/');
        $embedUrl = $baseUrl.'/'.$slug;

        return [
            'available' => true,
            'slug' => $slug,
            'embedUrl' => $embedUrl,
            'iframeCode' => self::iframeCode($slug, $baseUrl),
        ];
    }
}
