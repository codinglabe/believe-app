<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fundme_campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->onDelete('cascade');
            $table->foreignId('fundme_category_id')->constrained('fundme_categories')->onDelete('restrict');
            $table->string('title', 120);
            $table->string('slug')->unique();
            $table->unsignedBigInteger('goal_amount'); // in cents
            $table->unsignedBigInteger('raised_amount')->default(0); // in cents
            $table->string('cover_image')->nullable();
            $table->text('helps_who'); // Who This Helps (min 50–100 words)
            $table->text('fund_usage'); // What Funds Will Be Used For
            $table->text('expected_impact'); // Expected Impact
            $table->boolean('use_of_funds_confirmation')->default(false);
            $table->enum('status', ['draft', 'in_review', 'live', 'rejected', 'frozen'])->default('draft');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
            $table->index(['status', 'fundme_category_id']);
            $table->index('organization_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fundme_campaigns');
    }
};
