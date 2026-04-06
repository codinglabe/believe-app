<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adds category_id (FK to categories) and removes legacy string category column.
 * Does not modify the original marketplace_products create migration.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('marketplace_products')) {
            return;
        }

        if (Schema::hasColumn('marketplace_products', 'category_id')) {
            return;
        }

        Schema::table('marketplace_products', function (Blueprint $table) {
            $table->foreignId('category_id')->nullable()->after('description')->constrained('categories')->nullOnDelete();
            $table->index('category_id');
        });

        if (Schema::hasColumn('marketplace_products', 'category')) {
            $rows = DB::table('marketplace_products')
                ->whereNotNull('category')
                ->where('category', '!=', '')
                ->get(['id', 'category']);

            foreach ($rows as $row) {
                $categoryId = DB::table('categories')
                    ->where('name', $row->category)
                    ->value('id');
                if ($categoryId) {
                    DB::table('marketplace_products')
                        ->where('id', $row->id)
                        ->update(['category_id' => $categoryId]);
                }
            }

            Schema::table('marketplace_products', function (Blueprint $table) {
                $table->dropIndex(['category']);
                $table->dropColumn('category');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('marketplace_products')) {
            return;
        }

        if (! Schema::hasColumn('marketplace_products', 'category_id')) {
            return;
        }

        Schema::table('marketplace_products', function (Blueprint $table) {
            $table->string('category', 255)->nullable()->after('description');
            $table->index('category');
        });

        $rows = DB::table('marketplace_products')
            ->whereNotNull('category_id')
            ->join('categories', 'marketplace_products.category_id', '=', 'categories.id')
            ->select('marketplace_products.id', 'categories.name')
            ->get();

        foreach ($rows as $row) {
            DB::table('marketplace_products')
                ->where('id', $row->id)
                ->update(['category' => $row->name]);
        }

        Schema::table('marketplace_products', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropIndex(['category_id']);
            $table->dropColumn('category_id');
        });
    }
};
