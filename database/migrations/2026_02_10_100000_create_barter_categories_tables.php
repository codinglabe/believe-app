<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('barter_categories')) {
        Schema::create('barter_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });
        }

        if (!Schema::hasTable('barter_subcategories')) {
        Schema::create('barter_subcategories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('barter_category_id')->constrained('barter_categories')->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
            $table->unique(['barter_category_id', 'slug']);
        });
        }

        if (!Schema::hasTable('barter_benefit_groups')) {
        Schema::create('barter_benefit_groups', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });
        }

        if (Schema::hasTable('nonprofit_barter_listings') && !Schema::hasColumn('nonprofit_barter_listings', 'barter_category_id')) {
            Schema::table('nonprofit_barter_listings', function (Blueprint $table) {
                $table->unsignedBigInteger('barter_category_id')->nullable()->after('description');
                $table->unsignedBigInteger('barter_subcategory_id')->nullable()->after('barter_category_id');
                $table->foreign('barter_category_id', 'barter_listings_category_fk')->references('id')->on('barter_categories')->nullOnDelete();
                $table->foreign('barter_subcategory_id', 'barter_listings_subcategory_fk')->references('id')->on('barter_subcategories')->nullOnDelete();
            });
        }

        if (!Schema::hasTable('barter_listing_benefit_groups')) {
        Schema::create('barter_listing_benefit_groups', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('nonprofit_barter_listing_id');
            $table->unsignedBigInteger('barter_benefit_group_id');
            $table->timestamps();
            $table->unique(['nonprofit_barter_listing_id', 'barter_benefit_group_id'], 'barter_list_benefit_unique');
            $table->foreign('nonprofit_barter_listing_id', 'barter_list_benefit_listing_fk')->references('id')->on('nonprofit_barter_listings')->cascadeOnDelete();
            $table->foreign('barter_benefit_group_id', 'barter_list_benefit_group_fk')->references('id')->on('barter_benefit_groups')->cascadeOnDelete();
        });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('barter_listing_benefit_groups');
        Schema::table('nonprofit_barter_listings', function (Blueprint $table) {
            $table->dropForeign('barter_listings_category_fk');
            $table->dropForeign('barter_listings_subcategory_fk');
        });
        Schema::dropIfExists('barter_benefit_groups');
        Schema::dropIfExists('barter_subcategories');
        Schema::dropIfExists('barter_categories');
    }
};
