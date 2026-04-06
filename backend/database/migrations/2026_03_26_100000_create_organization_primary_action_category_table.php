<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Short table name keeps MySQL auto-generated FK constraint names under 64 chars. */
    private const PIVOT = 'org_primary_action_category';

    public function up(): void
    {
        Schema::create(self::PIVOT, function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('primary_action_category_id')
                ->constrained('primary_action_categories')
                ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['organization_id', 'primary_action_category_id'], 'org_pac_unique');
        });

        if (Schema::hasColumn('organizations', 'primary_action_category_id')) {
            $rows = DB::table('organizations')
                ->whereNotNull('primary_action_category_id')
                ->get(['id', 'primary_action_category_id']);

            foreach ($rows as $row) {
                DB::table(self::PIVOT)->insert([
                    'organization_id' => $row->id,
                    'primary_action_category_id' => $row->primary_action_category_id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            Schema::table('organizations', function (Blueprint $table) {
                $table->dropConstrainedForeignId('primary_action_category_id');
            });
        }
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->foreignId('primary_action_category_id')
                ->nullable()
                ->after('name')
                ->constrained('primary_action_categories')
                ->nullOnDelete();
        });

        $pivot = DB::table(self::PIVOT)->orderBy('organization_id')->get();

        foreach ($pivot->groupBy('organization_id') as $orgId => $rows) {
            $first = $rows->first();
            DB::table('organizations')->where('id', $orgId)->update([
                'primary_action_category_id' => $first->primary_action_category_id,
            ]);
        }

        Schema::dropIfExists(self::PIVOT);
    }
};
