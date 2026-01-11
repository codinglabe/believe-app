<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Populate slugs for existing offers that don't have one
        $offers = DB::table('merchant_hub_offers')->whereNull('slug')->get();

        foreach ($offers as $offer) {
            if (empty($offer->title)) {
                continue;
            }

            $slug = Str::slug($offer->title);
            $originalSlug = $slug;
            $counter = 1;

            // Ensure slug is unique
            while (DB::table('merchant_hub_offers')
                ->where('slug', $slug)
                ->where('id', '!=', $offer->id)
                ->exists()) {
                $slug = $originalSlug . '-' . $counter;
                $counter++;
            }

            DB::table('merchant_hub_offers')
                ->where('id', $offer->id)
                ->update(['slug' => $slug]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Optionally clear slugs (but we'll keep them)
        // DB::table('merchant_hub_offers')->update(['slug' => null]);
    }
};

