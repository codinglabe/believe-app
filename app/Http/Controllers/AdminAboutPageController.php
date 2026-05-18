<?php

namespace App\Http\Controllers;

use App\Models\AboutPageContent;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AdminAboutPageController extends Controller
{
    public function edit()
    {
        $content = AboutPageContent::first();

        if (!$content) {
            $content = AboutPageContent::create([
                'content' => AboutPageContent::defaultContent(),
            ]);
        }

        return Inertia::render('admin/about/Edit', [
            'content' => $content->getContentOrDefault(),
            'iconOptions' => $this->iconOptions(),
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'content' => ['required', 'array'],
            'content.hero.title' => ['required', 'string', 'max:255'],
            'content.hero.subtitle' => ['nullable', 'string', 'max:255'],
            'content.hero.description' => ['nullable', 'string'],
            'content.hero.background_image' => ['nullable', 'string', 'max:2048'],
            'content.mission.title' => ['required', 'string', 'max:255'],
            'content.mission.description' => ['required', 'string'],
            'content.mission.icon' => ['nullable', 'string', Rule::in($this->iconOptions())],
            'content.mission.image' => ['nullable', 'string', 'max:2048'],
            'content.vision.title' => ['required', 'string', 'max:255'],
            'content.vision.description' => ['required', 'string'],
            'content.vision.icon' => ['nullable', 'string', Rule::in($this->iconOptions())],
            'content.stats' => ['nullable', 'array'],
            'content.stats.*.label' => ['required_with:content.stats.*.value', 'string', 'max:255'],
            'content.stats.*.value' => ['required_with:content.stats.*.label', 'string', 'max:255'],
            'content.stats.*.icon' => ['nullable', 'string', Rule::in($this->iconOptions())],
            'content.offerings' => ['nullable', 'array'],
            'content.offerings.*.title' => ['required_with:content.offerings.*.description', 'string', 'max:255'],
            'content.offerings.*.description' => ['required_with:content.offerings.*.title', 'string'],
            'content.offerings.*.tagline' => ['nullable', 'string', 'max:255'],
            'content.offerings.*.icon' => ['nullable', 'string', Rule::in($this->iconOptions())],
            'content.story.title' => ['required', 'string', 'max:255'],
            'content.story.paragraphs' => ['nullable', 'array'],
            'content.story.paragraphs.*' => ['nullable', 'string'],
            'content.team' => ['nullable', 'array'],
            'content.team.*.name' => ['required_with:content.team.*.role', 'string', 'max:255'],
            'content.team.*.role' => ['nullable', 'string', 'max:255'],
            'content.team.*.image' => ['nullable', 'string', 'max:2048'],
            'content.team.*.bio' => ['nullable', 'string'],
            'content.values' => ['nullable', 'array'],
            'content.values.*.title' => ['required_with:content.values.*.description', 'string', 'max:255'],
            'content.values.*.description' => ['nullable', 'string'],
            'content.values.*.icon' => ['nullable', 'string', 'max:20'],
            'content.reasons' => ['nullable', 'array'],
            'content.reasons.*' => ['nullable', 'string'],
            'content.cta.title' => ['required', 'string', 'max:255'],
            'content.cta.subtitle' => ['nullable', 'string', 'max:255'],
            'content.cta.description' => ['nullable', 'string'],
            'content.cta.buttons' => ['nullable', 'array'],
            'content.cta.buttons.*.text' => ['required_with:content.cta.buttons.*.href', 'string', 'max:255'],
            'content.cta.buttons.*.href' => ['nullable', 'string', 'max:255'],
            'content.cta.buttons.*.variant' => ['nullable', 'string', Rule::in(['primary', 'secondary', 'outline'])],
            'hero_background_image' => ['nullable', 'image', 'max:5120'],
            'mission_image' => ['nullable', 'image', 'max:5120'],
            'team_images' => ['nullable', 'array'],
            'team_images.*' => ['nullable', 'image', 'max:5120'],
        ]);

        $content = AboutPageContent::first();

        if (!$content) {
            $content = AboutPageContent::create([
                'content' => AboutPageContent::defaultContent(),
            ]);
        }

        $currentContent = $content->content ?? [];
        $contentData = $validated['content'];

        if ($request->hasFile('hero_background_image')) {
            $this->deleteExistingAsset(data_get($currentContent, 'hero.background_image'));
            $heroPath = $request->file('hero_background_image')->store('about/hero', 'public');
            $contentData['hero']['background_image'] = Storage::url($heroPath);
        } elseif (empty($contentData['hero']['background_image'])) {
            $this->deleteExistingAsset(data_get($currentContent, 'hero.background_image'));
            $contentData['hero']['background_image'] = null;
        }

        if ($request->hasFile('mission_image')) {
            $this->deleteExistingAsset(data_get($currentContent, 'mission.image'));
            $missionPath = $request->file('mission_image')->store('about/mission', 'public');
            $contentData['mission']['image'] = Storage::url($missionPath);
        } elseif (empty($contentData['mission']['image'])) {
            $this->deleteExistingAsset(data_get($currentContent, 'mission.image'));
            $contentData['mission']['image'] = null;
        }

        $teamImageFiles = $request->file('team_images', []);
        if (is_array($teamImageFiles)) {
            $teamImageFiles = array_filter(
                $teamImageFiles,
                fn ($file) => $file instanceof UploadedFile && $file->isValid()
            );

            foreach ($teamImageFiles as $index => $imageFile) {
                if (!isset($contentData['team'][$index])) {
                    continue;
                }

                $this->deleteExistingAsset(data_get($currentContent, "team.$index.image"));

                $teamPath = $imageFile->store('about/team', 'public');
                $contentData['team'][$index]['image'] = Storage::url($teamPath);
            }
        }

        $existingTeamImages = [];
        foreach (data_get($currentContent, 'team', []) as $member) {
            if (!empty($member['image'])) {
                $existingTeamImages[] = $member['image'];
            }
        }

        $newTeamImages = [];
        foreach ($contentData['team'] ?? [] as $member) {
            if (!empty($member['image'])) {
                $newTeamImages[] = $member['image'];
            }
        }

        $removedTeamImages = array_diff($existingTeamImages, $newTeamImages);
        foreach ($removedTeamImages as $removedImageUrl) {
            $this->deleteExistingAsset($removedImageUrl);
        }

        $content->update([
            'content' => $contentData,
        ]);

        return redirect()->back()->with('success', 'About page updated successfully.');
    }

    /**
     * @return array<int, string>
     */
    private function iconOptions(): array
    {
        return [
            'Award',
            'Brain',
            'Briefcase',
            'Calendar',
            'CheckCircle',
            'DollarSign',
            'Eye',
            'Globe',
            'GraduationCap',
            'Heart',
            'MessageCircle',
            'Network',
            'Newspaper',
            'FileText',
            'ShoppingBag',
            'Target',
            'Users',
        ];
    }

    private function deleteExistingAsset(?string $url): void
    {
        if (!$url) {
            return;
        }

        $path = $this->extractStoragePath($url);
        if (!$path) {
            return;
        }

        Storage::disk('public')->delete($path);
    }

    private function extractStoragePath(string $url): ?string
    {
        $parsedPath = parse_url($url, PHP_URL_PATH);
        if (!$parsedPath) {
            return null;
        }

        $normalizedPath = ltrim($parsedPath, '/');

        if (Str::startsWith($normalizedPath, 'storage/')) {
            return Str::after($normalizedPath, 'storage/');
        }

        return null;
    }
}

