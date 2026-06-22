<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->string('sandbox_account_id')->nullable()->after('sandbox_customer_id');
            $table->string('test_account_id')->nullable()->after('test_customer_id');
            $table->string('live_account_id')->nullable()->after('live_customer_id');
        });
    }

    public function down(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->dropColumn([
                'sandbox_account_id',
                'test_account_id',
                'live_account_id',
            ]);
        });
    }
};
