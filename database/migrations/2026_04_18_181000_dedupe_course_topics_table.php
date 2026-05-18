<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('topics')) {
            return;
        }

        $groups = DB::table('topics')
            ->select('name', DB::raw('MIN(id) as keep_id'), DB::raw('COUNT(*) as cnt'))
            ->groupBy('name')
            ->having('cnt', '>', 1)
            ->get();

        foreach ($groups as $row) {
            $keepId = (int) $row->keep_id;
            $removeIds = DB::table('topics')
                ->where('name', $row->name)
                ->where('id', '!=', $keepId)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();

            if ($removeIds === []) {
                continue;
            }

            if (Schema::hasTable('courses')) {
                DB::table('courses')->whereIn('topic_id', $removeIds)->update(['topic_id' => $keepId]);
            }

            DB::table('topics')->whereIn('id', $removeIds)->delete();
        }
    }

    public function down(): void
    {
        // Data merge is not reversible.
    }
};
