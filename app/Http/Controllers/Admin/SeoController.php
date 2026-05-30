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
        return Inertia::render('admin/seo/Index', [
            'settings' => SeoService::getSettingsForAdmin(),
            'pageKeys' => SeoService::PAGE_KEYS,
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
            'default_share_image_file' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:5120'],
            'remove_default_share_image' => ['nullable', 'boolean'],
            'pages' => ['nullable', 'array'],
            'pages.*.title' => ['nullable', 'string', 'max:255'],
            'pages.*.subtitle' => ['nullable', 'string', 'max:500'],
            'pages.*.description' => ['nullable', 'string', 'max:500'],
            'pages.*.remove_share_image' => ['nullable', 'boolean'],
            'page_share_image_files' => ['nullable', 'array'],
            'page_share_image_files.*' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:5120'],
        ]);

        $existing = SeoService::getSettings();
        $defaultShareImage = trim((string) $request->input('default_share_image', $existing['default_share_image'] ?? ''));

        if ($request->boolean('remove_default_share_image')) {
            SeoService::deleteShareImage($existing['default_share_image'] ?? null);
            $defaultShareImage = '';
        } elseif ($request->hasFile('default_share_image_file')) {
            SeoService::deleteShareImage($existing['default_share_image'] ?? null);
            $defaultShareImage = SeoService::storeShareImage($request->file('default_share_image_file'), 'default');
        }

        $pages = [];
        foreach (array_keys(SeoService::PAGE_KEYS) as $key) {
            $existingPage = is_array($existing['pages'][$key] ?? null) ? $existing['pages'][$key] : [];
            $shareImage = trim((string) ($existingPage['share_image'] ?? ''));

            if ($request->boolean("pages.{$key}.remove_share_image")) {
                SeoService::deleteShareImage($shareImage);
                $shareImage = '';
            } elseif ($request->hasFile("page_share_image_files.{$key}")) {
                SeoService::deleteShareImage($shareImage);
                $shareImage = SeoService::storeShareImage($request->file("page_share_image_files.{$key}"), "page-{$key}");
            }

            $pages[$key] = [
                'title' => $request->input("pages.{$key}.title"),
                'description' => $request->input("pages.{$key}.description"),
                'subtitle' => $key === 'home' ? $request->input('pages.home.subtitle') : ($existingPage['subtitle'] ?? ''),
                'share_image' => $shareImage,
            ];
        }

        SeoService::saveSettings([
            'site_name' => $request->input('site_name'),
            'default_description' => $request->input('default_description'),
            'default_share_image' => $defaultShareImage,
            'pages' => $pages,
        ]);

        return redirect()->route('admin.seo.index')->with('success', 'SEO settings saved successfully.');
    }
}
