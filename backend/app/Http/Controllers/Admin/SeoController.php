<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\SeoService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SeoController extends Controller
{
    /**
     * Show the SEO settings form.
     */
    public function index()
    {
        $settings = SeoService::getSettings();
        $pageKeys = SeoService::PAGE_KEYS;

        return Inertia::render('admin/seo/Index', [
            'settings' => $settings,
            'pageKeys' => $pageKeys,
        ]);
    }

    /**
     * Update SEO settings.
     */
    public function update(Request $request)
    {
        $request->validate([
            'site_name' => ['nullable', 'string', 'max:255'],
            'default_description' => ['nullable', 'string', 'max:500'],
            'default_share_image' => ['nullable', 'string', 'max:2048'],
            'pages' => ['nullable', 'array'],
            'pages.*.title' => ['nullable', 'string', 'max:255'],
            'pages.*.description' => ['nullable', 'string', 'max:500'],
        ]);

        $data = [
            'site_name' => $request->input('site_name'),
            'default_description' => $request->input('default_description'),
            'default_share_image' => $request->input('default_share_image'),
            'pages' => [],
        ];

        foreach (array_keys(SeoService::PAGE_KEYS) as $key) {
            $data['pages'][$key] = [
                'title' => $request->input("pages.{$key}.title"),
                'description' => $request->input("pages.{$key}.description"),
            ];
        }

        SeoService::saveSettings($data);

        return redirect()->route('admin.seo.index')->with('success', 'SEO settings saved successfully.');
    }
}
