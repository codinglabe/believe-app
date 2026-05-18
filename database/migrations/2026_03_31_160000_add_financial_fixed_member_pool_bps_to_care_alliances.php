<?php

use App\Models\CareAlliance;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('care_alliances', function (Blueprint $table) {
            $table->unsignedSmallInteger('financial_fixed_member_pool_bps')->nullable()->after('financial_fixed_splits');
        });

        CareAlliance::query()
            ->where('allocation_method', 'fixed_percentage')
            ->whereNotNull('financial_fixed_splits')
            ->chunkById(100, function ($alliances) {
                foreach ($alliances as $a) {
                    $rows = $a->financial_fixed_splits;
                    if (! is_array($rows) || $rows === []) {
                        continue;
                    }
                    $sumBps = (int) collect($rows)->sum(fn (array $r) => (int) ($r['percent_bps'] ?? 0));
                    if ($sumBps > 0) {
                        $a->financial_fixed_member_pool_bps = min(10000, $sumBps);
                        $a->financial_fixed_splits = null;
                        $a->save();
                    }
                }
            });
    }

    public function down(): void
    {
        Schema::table('care_alliances', function (Blueprint $table) {
            $table->dropColumn('financial_fixed_member_pool_bps');
        });
    }
};
