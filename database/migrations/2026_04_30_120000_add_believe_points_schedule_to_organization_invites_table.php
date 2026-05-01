<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organization_invites', function (Blueprint $table) {
            $table->timestamp('believe_points_schedule_started_at')->nullable()->after('points_awarded_at');
            $table->unsignedTinyInteger('believe_points_installments_credited')->default(0)->after('believe_points_schedule_started_at');
        });
    }

    public function down(): void
    {
        Schema::table('organization_invites', function (Blueprint $table) {
            $table->dropColumn([
                'believe_points_schedule_started_at',
                'believe_points_installments_credited',
            ]);
        });
    }
};
