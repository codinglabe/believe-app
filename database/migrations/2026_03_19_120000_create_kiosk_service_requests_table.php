<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kiosk_service_requests', function (Blueprint $table) {
            $table->id();
            $table->string('requester_name', 120)->nullable();
            $table->string('requester_email', 190)->nullable()->index();
            $table->string('market_code', 64)->nullable()->index();
            $table->string('state', 64)->nullable();
            $table->string('city', 128)->nullable();
            $table->string('category_slug', 64)->index();
            $table->string('subcategory', 128)->nullable();
            $table->string('display_name');
            $table->string('url', 500)->nullable();
            $table->text('details')->nullable();

            // approved | pending | rejected
            $table->string('status', 16)->default('pending')->index();
            // ai decision + explanation
            $table->string('ai_decision', 16)->nullable()->index();
            $table->text('ai_reason')->nullable();
            $table->string('ai_suggested_url', 500)->nullable();
            $table->unsignedInteger('ai_tokens_used')->default(0);

            // allows user to edit pending request link without auth
            $table->string('edit_token', 64)->unique();

            // service created when approved
            $table->unsignedBigInteger('approved_service_id')->nullable()->index();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('resolved_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kiosk_service_requests');
    }
};

