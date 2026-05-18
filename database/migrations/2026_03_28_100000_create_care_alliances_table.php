<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('care_alliances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('creator_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('slug')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('city', 128)->nullable();
            $table->string('state', 64)->nullable();
            $table->string('website', 500)->nullable();
            $table->string('ein', 32)->nullable();
            $table->unsignedSmallInteger('management_fee_bps')->nullable()->comment('Basis points, e.g. 500 = 5%');
            $table->string('fund_model', 32)->default('campaign_split'); // direct | campaign_split
            $table->string('status', 32)->default('active');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('care_alliances');
    }
};
