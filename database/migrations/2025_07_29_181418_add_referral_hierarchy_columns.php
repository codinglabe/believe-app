<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // Add columns to node_sells table
        Schema::table('node_sells', function (Blueprint $table) {
            $table->boolean('is_big_boss')->default(false)->after('certificate_id');
        });

        // Add columns to node_referrals table
        Schema::table('node_referrals', function (Blueprint $table) {
            $table->unsignedBigInteger('parent_referral_id')->nullable()->after('node_sell_id');
            $table->boolean('is_big_boss')->default(false)->after('parchentage');
            $table->integer('level')->default(1)->after('is_big_boss');
            
            $table->foreign('parent_referral_id')->references('id')->on('node_referrals')->onDelete('set null');
        });
    }

    public function down()
    {
        Schema::table('node_sells', function (Blueprint $table) {
            $table->dropColumn('is_big_boss');
        });

        Schema::table('node_referrals', function (Blueprint $table) {
            $table->dropForeign(['parent_referral_id']);
            $table->dropColumn(['parent_referral_id', 'is_big_boss', 'level']);
        });
    }
};
