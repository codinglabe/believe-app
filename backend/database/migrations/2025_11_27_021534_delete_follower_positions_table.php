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
        if (Schema::hasTable('follower_positions')) {
            Schema::rename('follower_positions', 'supporter_positions');
        }

        if (Schema::hasTable('following_user_positions')) {
            Schema::rename('following_user_positions', 'supporter_user_positions');
        }

        if(Schema::hasTable('supported_user_positions')) {
            Schema::rename('supported_user_positions', 'supporter_user_positions');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
