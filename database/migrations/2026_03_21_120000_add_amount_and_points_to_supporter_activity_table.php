<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('supporter_activity', 'amount_cents')) {
            Schema::table('supporter_activity', function (Blueprint $table) {
                $table->unsignedBigInteger('amount_cents')->nullable()->after('reference_id');
            });
        }

        if (! Schema::hasColumn('supporter_activity', 'believe_points')) {
            Schema::table('supporter_activity', function (Blueprint $table) {
                $after = Schema::hasColumn('supporter_activity', 'amount_cents') ? 'amount_cents' : 'reference_id';
                $table->unsignedInteger('believe_points')->nullable()->after($after);
            });
        }
    }

    public function down(): void
    {
        $drop = array_values(array_filter([
            Schema::hasColumn('supporter_activity', 'believe_points') ? 'believe_points' : null,
            Schema::hasColumn('supporter_activity', 'amount_cents') ? 'amount_cents' : null,
        ]));

        if ($drop !== []) {
            Schema::table('supporter_activity', function (Blueprint $table) use ($drop) {
                $table->dropColumn($drop);
            });
        }
    }
};
