<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Products and marketplace products must reference top-level (parent) categories only.
 * Remap any existing child category IDs to their parent_id and dedupe pivot rows.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('categories') || ! Schema::hasColumn('categories', 'parent_id')) {
            return;
        }

        if (Schema::hasTable('marketplace_products') && Schema::hasColumn('marketplace_products', 'category_id')) {
            foreach (DB::table('marketplace_products')->whereNotNull('category_id')->cursor() as $row) {
                $cat = DB::table('categories')->where('id', $row->category_id)->first();
                if ($cat && $cat->parent_id) {
                    DB::table('marketplace_products')->where('id', $row->id)->update(['category_id' => $cat->parent_id]);
                }
            }
        }

        if (! Schema::hasTable('product_associated_categories')) {
            return;
        }

        foreach (DB::table('product_associated_categories')->cursor() as $row) {
            $cat = DB::table('categories')->where('id', $row->category_id)->first();
            if ($cat && $cat->parent_id) {
                DB::table('product_associated_categories')->where('id', $row->id)->update(['category_id' => $cat->parent_id]);
            }
        }

        $duplicateIds = [];
        $seen = [];
        foreach (DB::table('product_associated_categories')->orderBy('id')->get() as $row) {
            $key = $row->product_id.'-'.$row->category_id;
            if (isset($seen[$key])) {
                $duplicateIds[] = $row->id;
            } else {
                $seen[$key] = true;
            }
        }
        if ($duplicateIds !== []) {
            foreach (array_chunk($duplicateIds, 500) as $chunk) {
                DB::table('product_associated_categories')->whereIn('id', $chunk)->delete();
            }
        }
    }

    public function down(): void
    {
        // Not reversible without storing previous child category ids.
    }
};
