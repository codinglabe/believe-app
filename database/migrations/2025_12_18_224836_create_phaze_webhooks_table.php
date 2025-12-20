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
        Schema::create('phaze_webhooks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('phaze_webhook_id')->nullable()->comment('Phaze API webhook ID');
            $table->string('url');
            $table->string('api_key')->comment('API key that Phaze will use to call this webhook');
            $table->string('authorization_header_name')->default('authorization');
            $table->unsignedBigInteger('account_id')->nullable()->comment('Phaze account ID');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('phaze_webhook_id');
            $table->index('url');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('phaze_webhooks');
    }
};
