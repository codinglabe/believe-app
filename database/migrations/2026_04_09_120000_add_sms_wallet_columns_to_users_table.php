<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'sms_included')) {
                $table->unsignedBigInteger('sms_included')->default(0)->after('emails_used');
            }
            if (! Schema::hasColumn('users', 'sms_used')) {
                $table->unsignedBigInteger('sms_used')->default(0)->after('sms_included');
            }
            if (! Schema::hasColumn('users', 'sms_auto_recharge_enabled')) {
                $table->boolean('sms_auto_recharge_enabled')->default(false)->after('sms_used');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['sms_included', 'sms_used', 'sms_auto_recharge_enabled']);
        });
    }
};
