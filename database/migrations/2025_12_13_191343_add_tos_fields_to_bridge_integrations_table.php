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
        Schema::table('bridge_integrations', function (Blueprint $table) {
            $table->text('tos_link_url')->nullable()->after('kyb_link_url');
            $table->enum('tos_status', ['pending', 'accepted', 'rejected'])->default('pending')->after('tos_link_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bridge_integrations', function (Blueprint $table) {
            $table->dropColumn(['tos_link_url', 'tos_status']);
        });
    }
};
