<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('event_types')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        // Merge duplicate (name, category) rows into the lowest id, then remove extras.
        $groups = DB::table('event_types')
            ->select('name', 'category', DB::raw('MIN(id) as keep_id'), DB::raw('COUNT(*) as cnt'))
            ->groupBy('name', 'category')
            ->having('cnt', '>', 1)
            ->get();

        foreach ($groups as $row) {
            $keepId = (int) $row->keep_id;
            $ids = DB::table('event_types')
                ->where('name', $row->name)
                ->where('category', $row->category)
                ->orderBy('id')
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();

            $removeIds = array_values(array_filter($ids, fn (int $id) => $id !== $keepId));

            if ($removeIds === []) {
                continue;
            }

            if (Schema::hasTable('courses')) {
                DB::table('courses')->whereIn('event_type_id', $removeIds)->update(['event_type_id' => $keepId]);
            }
            if (Schema::hasTable('events')) {
                DB::table('events')->whereIn('event_type_id', $removeIds)->update(['event_type_id' => $keepId]);
            }

            DB::table('event_types')->whereIn('id', $removeIds)->delete();
        }

        // Unique catalog row per name + category (MySQL / SQLite compatible).
        Schema::table('event_types', function (Blueprint $table) use ($driver) {
            if ($driver === 'mysql') {
                $table->unique(['name', 'category'], 'event_types_name_category_unique');
            } else {
                $table->unique(['name', 'category']);
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('event_types')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        Schema::table('event_types', function (Blueprint $table) use ($driver) {
            if ($driver === 'mysql') {
                $table->dropUnique('event_types_name_category_unique');
            } else {
                $table->dropUnique(['name', 'category']);
            }
        });
    }
};
