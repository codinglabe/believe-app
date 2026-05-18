<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // পুরোনো columns ডিলিট করুন
        Schema::table('facebook_accounts', function (Blueprint $table) {
            // Remove app-specific columns
            $table->dropColumn([
                'facebook_app_id',
                'facebook_app_secret',
                'app_name',
                'is_default_app',
                'callback_url'
            ]);

            // Add simple columns
            $table->string('facebook_user_id')->nullable()->after('organization_id');
            $table->string('facebook_user_name')->nullable()->after('facebook_user_id');
        });
    }

    public function down()
    {
        Schema::table('facebook_accounts', function (Blueprint $table) {
            $table->string('facebook_app_id')->nullable();
            $table->string('facebook_app_secret')->nullable();
            $table->string('app_name')->nullable();
            $table->boolean('is_default_app')->default(false);
            $table->string('callback_url')->nullable();

            $table->dropColumn(['facebook_user_id', 'facebook_user_name']);
        });
    }
};
