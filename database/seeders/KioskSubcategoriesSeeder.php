<?php

namespace Database\Seeders;

use App\Models\KioskService;
use App\Models\KioskSubcategory;
use Illuminate\Database\Seeder;

class KioskSubcategoriesSeeder extends Seeder
{
    public function run(): void
    {
        $rows = KioskService::query()
            ->whereNotNull('subcategory')
            ->where('subcategory', '!=', '')
            ->orderBy('category_slug')
            ->orderBy('item_sort_within_category')
            ->get(['category_slug', 'subcategory']);

        $grouped = [];
        foreach ($rows as $row) {
            $slug = (string) $row->category_slug;
            $name = trim((string) $row->subcategory);
            if ($slug === '' || $name === '') {
                continue;
            }
            if (! isset($grouped[$slug])) {
                $grouped[$slug] = [];
            }
            if (! in_array($name, $grouped[$slug], true)) {
                $grouped[$slug][] = $name;
            }
        }

        foreach ($grouped as $categorySlug => $subcategories) {
            foreach ($subcategories as $i => $name) {
                KioskSubcategory::updateOrCreate(
                    ['category_slug' => $categorySlug, 'name' => $name],
                    ['sort_order' => $i + 1]
                );
            }
        }
    }
}

