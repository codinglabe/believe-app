<?php

use App\Models\BoardMember;
use App\Models\CareAlliance;
use App\Models\Organization;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('care_alliances', function (Blueprint $table) {
            $table->foreignId('hub_organization_id')
                ->nullable()
                ->after('creator_user_id')
                ->constrained('organizations')
                ->nullOnDelete();
        });

        CareAlliance::query()->orderBy('id')->chunkById(50, function ($alliances) {
            foreach ($alliances as $alliance) {
                if ($alliance->hub_organization_id) {
                    continue;
                }

                $orgId = Organization::query()
                    ->where('user_id', $alliance->creator_user_id)
                    ->orderByDesc('id')
                    ->value('id');

                if (! $orgId) {
                    $orgId = BoardMember::query()
                        ->where('user_id', $alliance->creator_user_id)
                        ->orderByDesc('id')
                        ->value('organization_id');
                }

                if (! $orgId && $alliance->ein) {
                    $digits = preg_replace('/\D/', '', (string) $alliance->ein);
                    if (strlen($digits) >= 9) {
                        $digits = substr($digits, 0, 9);
                        $hyphen = substr($digits, 0, 2).'-'.substr($digits, 2);
                        $orgId = Organization::query()
                            ->whereIn('ein', [$digits, $hyphen])
                            ->orderByDesc('id')
                            ->value('id');
                    }
                }

                if ($orgId) {
                    DB::table('care_alliances')->where('id', $alliance->id)->update([
                        'hub_organization_id' => $orgId,
                    ]);
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('care_alliances', function (Blueprint $table) {
            $table->dropConstrainedForeignId('hub_organization_id');
        });
    }
};
