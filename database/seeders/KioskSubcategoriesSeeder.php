<?php

namespace Database\Seeders;

use App\Models\KioskSubcategory;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Database\Seeder;

class KioskSubcategoriesSeeder extends Seeder
{
    public function run(): void
    {
        if (! Schema::hasTable('kiosk_providers')) {
            return;
        }

        $rows = DB::table('kiosk_providers')
            ->select('category_slug', 'subcategory_slug')
            ->where('subcategory_slug', '!=', '')
            ->distinct()
            ->get();

        $grouped = [];
        foreach ($rows as $row) {
            $slug = (string) $row->category_slug;
            $name = Str::title(str_replace('-', ' ', (string) $row->subcategory_slug));
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
