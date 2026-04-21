<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('supporter_believe_point_gifts', function (Blueprint $table) {
            if (! Schema::hasColumn('supporter_believe_point_gifts', 'gift_occasion_id')) {
                $table->foreignId('gift_occasion_id')
                    ->nullable()
                    ->after('recipient_id')
                    ->constrained('gift_occasions')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('supporter_believe_point_gifts', 'sent_at')) {
                $table->timestamp('sent_at')->nullable()->after('message');
            }
        });
    }

    public function down(): void
    {
        Schema::table('supporter_believe_point_gifts', function (Blueprint $table) {
            if (Schema::hasColumn('supporter_believe_point_gifts', 'gift_occasion_id')) {
                $table->dropConstrainedForeignId('gift_occasion_id');
            }

            if (Schema::hasColumn('supporter_believe_point_gifts', 'sent_at')) {
                $table->dropColumn('sent_at');
            }
        });
    }
};
