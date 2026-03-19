<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\URL;

class SitemapController extends Controller
{
    /**
     * Generate sitemap.xml for SEO. Includes static pages and organization profile URLs.
     */
    public function index(): Response
    {
        $baseUrl = rtrim(config('app.url'), '/');
        $now = now()->toAtomString();

        $urls = [
            ['loc' => $baseUrl, 'lastmod' => $now, 'changefreq' => 'daily', 'priority' => '1.0'],
            ['loc' => "{$baseUrl}/about", 'lastmod' => $now, 'changefreq' => 'monthly', 'priority' => '0.9'],
            ['loc' => "{$baseUrl}/donate", 'lastmod' => $now, 'changefreq' => 'weekly', 'priority' => '0.9'],
            ['loc' => "{$baseUrl}/organizations", 'lastmod' => $now, 'changefreq' => 'daily', 'priority' => '0.9'],
            ['loc' => "{$baseUrl}/privacy-policy", 'lastmod' => $now, 'changefreq' => 'yearly', 'priority' => '0.3'],
            ['loc' => "{$baseUrl}/terms-of-service", 'lastmod' => $now, 'changefreq' => 'yearly', 'priority' => '0.3'],
            ['loc' => "{$baseUrl}/contact", 'lastmod' => $now, 'changefreq' => 'monthly', 'priority' => '0.7'],
            ['loc' => "{$baseUrl}/fundraise", 'lastmod' => $now, 'changefreq' => 'monthly', 'priority' => '0.8'],
            ['loc' => "{$baseUrl}/nonprofit-news", 'lastmod' => $now, 'changefreq' => 'weekly', 'priority' => '0.7'],
            ['loc' => "{$baseUrl}/jobs", 'lastmod' => $now, 'changefreq' => 'weekly', 'priority' => '0.8'],
            ['loc' => "{$baseUrl}/volunteer-opportunities", 'lastmod' => $now, 'changefreq' => 'weekly', 'priority' => '0.8'],
            ['loc' => "{$baseUrl}/marketplace", 'lastmod' => $now, 'changefreq' => 'weekly', 'priority' => '0.8'],
            ['loc' => "{$baseUrl}/service-hub", 'lastmod' => $now, 'changefreq' => 'weekly', 'priority' => '0.8'],
            ['loc' => "{$baseUrl}/courses", 'lastmod' => $now, 'changefreq' => 'weekly', 'priority' => '0.8'],
            ['loc' => "{$baseUrl}/all-events", 'lastmod' => $now, 'changefreq' => 'weekly', 'priority' => '0.8'],
        ];

        // Add organization profile URLs (public pages)
        $slugs = User::where('role', 'organization')
            ->whereNotNull('slug')
            ->where('slug', '!=', '')
            ->pluck('slug');

        foreach ($slugs as $slug) {
            $urls[] = [
                'loc' => "{$baseUrl}/organizations/{$slug}",
                'lastmod' => $now,
                'changefreq' => 'weekly',
                'priority' => '0.7',
            ];
        }

        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

        foreach ($urls as $u) {
            $xml .= '  <url>' . "\n";
            $xml .= '    <loc>' . htmlspecialchars($u['loc']) . '</loc>' . "\n";
            $xml .= '    <lastmod>' . $u['lastmod'] . '</lastmod>' . "\n";
            $xml .= '    <changefreq>' . $u['changefreq'] . '</changefreq>' . "\n";
            $xml .= '    <priority>' . $u['priority'] . '</priority>' . "\n";
            $xml .= '  </url>' . "\n";
        }

        $xml .= '</urlset>';

        return response($xml, 200, [
            'Content-Type' => 'application/xml',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }
}
