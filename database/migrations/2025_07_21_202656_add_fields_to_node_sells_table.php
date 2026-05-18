<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('node_sells', function (Blueprint $table) {
            $table->string('buyer_name')->after('amount');
            $table->string('buyer_email')->after('buyer_name');
            $table->text('message')->nullable()->after('buyer_email');
            $table->enum('status', ['pending', 'completed', 'failed', 'canceled'])->default('pending')->after('message');
            $table->string('payment_method')->default('stripe')->after('status');
            $table->string('transaction_id')->nullable()->after('payment_method');
            $table->string('certificate_id')->unique()->after('transaction_id');
            $table->timestamp('purchase_date')->nullable()->after('certificate_id');
        });
    }

    public function down()
    {
        Schema::table('node_sells', function (Blueprint $table) {
            $table->dropColumn([
                'buyer_name', 'buyer_email', 'message', 'status', 
                'payment_method', 'transaction_id', 'certificate_id', 'purchase_date'
            ]);
        });
    }
};
