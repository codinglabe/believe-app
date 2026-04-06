<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class PwaInstallController extends Controller
{
    public function installQr(Request $request): Response
    {
        $target = $request->string('target')->toString();
        $defaultUrl = $request->getSchemeAndHttpHost() . '/?install-pwa=1';
        $installUrl = filter_var($target, FILTER_VALIDATE_URL) ? $target : $defaultUrl;

        $size = (int) $request->integer('size', 512);
        $size = max(128, min($size, 1024));

        $svg = (string) QrCode::format('svg')
            ->size($size)
            ->margin(1)
            ->errorCorrection('H')
            ->generate($installUrl);

        $svgWithLogo = $this->embedLogo($svg, $size);

        $response = response($svgWithLogo, 200, [
            'Content-Type' => 'image/svg+xml',
            'Cache-Control' => 'no-store, max-age=0',
        ]);

        if ($request->boolean('download')) {
            $fileName = 'believe-app-install.svg';
            $response->header('Content-Disposition', 'attachment; filename="' . $fileName . '"');
        }

        return $response;
    }

    private function resolveLogoPath(): ?string
    {
        // Prioritize the same logo used in the dashboard sidebar (SiteTitle component)
        $candidateFiles = [
            public_path('favicon-96x96.png'),  // Same logo as dashboard sidebar
            public_path('favicon.svg'),         // SVG version if available
            public_path('logo.svg'),            // Alternative logo
            public_path('logo.png'),
            public_path('logo.jpg'),
            public_path('logo.jpeg'),
            public_path('logo.webp'),
            public_path('placeholder-logo.png'),
        ];

        foreach ($candidateFiles as $path) {
            if (is_string($path) && file_exists($path) && is_file($path)) {
                $extension = Str::lower(pathinfo($path, PATHINFO_EXTENSION));
                if (in_array($extension, ['png', 'jpg', 'jpeg', 'webp', 'svg'], true)) {
                    return $path;
                }
            }
        }

        return null;
    }

    private function embedLogo(string $svg, int $size): string
    {
        $logoPath = $this->resolveLogoPath();

        if ($logoPath === null) {
            return $svg;
        }

        $logoContents = file_get_contents($logoPath);
        if ($logoContents === false) {
            return $svg;
        }

        $mimeType = mime_content_type($logoPath) ?: 'image/png';
        $base64Logo = base64_encode($logoContents);

        $logoSize = (int) round($size * 0.22);
        $logoPosition = (int) round(($size - $logoSize) / 2);

        $logoMarkup = sprintf(
            '<image href="data:%s;base64,%s" x="%d" y="%d" width="%d" height="%d" preserveAspectRatio="xMidYMid meet" />',
            $mimeType,
            $base64Logo,
            $logoPosition,
            $logoPosition,
            $logoSize,
            $logoSize
        );

        $hasNamespace = str_contains($svg, 'xmlns:xlink');
        if (! $hasNamespace) {
            $svg = preg_replace('/^<svg\s/', '<svg xmlns:xlink="http://www.w3.org/1999/xlink" ', $svg, 1);
        }

        return preg_replace('/<\/svg>\s*$/', $logoMarkup . '</svg>', $svg, 1) ?? $svg;
    }
}

