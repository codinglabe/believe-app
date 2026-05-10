<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('unity_loaves_locations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->nullable()->index();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('state', 50)->nullable();
            $table->string('zip', 20)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('website')->nullable();
            $table->string('image_url')->nullable();
            $table->string('meal_type', 60)->default('food_pantry'); // food_pantry, hot_meals, community_meal
            $table->boolean('accepts_food_donations')->default(false);
            $table->text('dropoff_instructions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['city', 'state']);
            $table->index('is_active');
            $table->index('meal_type');
        });

        Schema::create('unity_loaves_schedules', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('location_id')->index();
            $table->string('schedule_type', 30); // meal, dropoff, service
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('day_of_week', 20)->nullable(); // monday, tuesday, etc.
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->string('recurrence_text')->nullable(); // e.g. "Every Tuesday", "2nd & 4th Saturday"
            $table->timestamps();

            $table->foreign('location_id')
                ->references('id')
                ->on('unity_loaves_locations')
                ->onDelete('cascade');

            $table->index('schedule_type');
        });

        Schema::create('unity_loaves_needs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('location_id')->index();
            $table->string('item_name');
            $table->string('category', 60)->nullable(); // canned_goods, grains, protein, breakfast, hygiene
            $table->string('priority_level', 20)->default('medium'); // low, medium, high, urgent
            $table->unsignedInteger('quantity_needed')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('updated_at')->nullable();

            $table->foreign('location_id')
                ->references('id')
                ->on('unity_loaves_locations')
                ->onDelete('cascade');
        });

        Schema::create('unity_loaves_impact_stats', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('location_id')->unique();
            $table->unsignedInteger('loaves_served')->default(0);
            $table->unsignedInteger('families_helped')->default(0);
            $table->unsignedInteger('total_loaves_year')->default(0);
            $table->timestamp('last_updated')->nullable();

            $table->foreign('location_id')
                ->references('id')
                ->on('unity_loaves_locations')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unity_loaves_impact_stats');
        Schema::dropIfExists('unity_loaves_needs');
        Schema::dropIfExists('unity_loaves_schedules');
        Schema::dropIfExists('unity_loaves_locations');
    }
};
