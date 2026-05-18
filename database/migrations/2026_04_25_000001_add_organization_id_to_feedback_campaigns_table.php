<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('feedback_campaigns', function (Blueprint $table) {
            // Make merchant_id nullable so org campaigns can have null merchant_id
            $table->unsignedBigInteger('merchant_id')->nullable()->change();

            // Add organization_id
            $table->foreignId('organization_id')
                ->nullable()
                ->after('merchant_id')
                ->constrained('organizations')
                ->onDelete('cascade');

            $table->index(['organization_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('feedback_campaigns', function (Blueprint $table) {
            $table->dropIndex(['organization_id', 'status']);
            $table->dropForeign(['organization_id']);
            $table->dropColumn('organization_id');
            $table->unsignedBigInteger('merchant_id')->nullable(false)->change();
        });
    }
};
