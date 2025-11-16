<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fractional_orders', function (Blueprint $table) {
            if (!Schema::hasColumn('fractional_orders', 'tag_number')) {
                $table->string('tag_number')->nullable()->after('offering_id');
            }
            if (!Schema::hasColumn('fractional_orders', 'tokens')) {
                $table->unsignedBigInteger('tokens')->default(0)->after('shares');
            }
        });
    }

    public function down(): void
    {
        Schema::table('fractional_orders', function (Blueprint $table) {
            if (Schema::hasColumn('fractional_orders', 'tag_number')) {
                $table->dropColumn('tag_number');
            }
            if (Schema::hasColumn('fractional_orders', 'tokens')) {
                $table->dropColumn('tokens');
            }
        });
    }
};
