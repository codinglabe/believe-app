<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            // Separate test credentials
            $table->text('test_publishable_key')->nullable()->after('client_secret');
            $table->text('test_secret_key')->nullable()->after('test_publishable_key');
            $table->string('test_customer_id')->nullable()->after('test_secret_key');
            
            // Separate live credentials
            $table->text('live_publishable_key')->nullable()->after('test_customer_id');
            $table->text('live_secret_key')->nullable()->after('live_publishable_key');
            $table->string('live_customer_id')->nullable()->after('live_secret_key');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->dropColumn([
                'test_publishable_key',
                'test_secret_key',
                'test_customer_id',
                'live_publishable_key',
                'live_secret_key',
                'live_customer_id',
            ]);
        });
    }
};
