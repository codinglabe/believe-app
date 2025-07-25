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
        Schema::table('node_shares', function (Blueprint $table) {
            $table->enum('status', ['open', 'closed'])->default('open')->after('remaining');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('node_shares', function (Blueprint $table) {
            $table->dropColumn("status");
        });
    }
};
