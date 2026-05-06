<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('streaming_monthly_usages', function (Blueprint $table) {
            $table->id();
            $table->string('organization_id', 100);
            $table->string('month_key', 7);
            $table->unsignedInteger('total_minutes')->default(0);
            $table->unsignedInteger('billable_minutes')->default(0);
            $table->unsignedInteger('overage_amount_cents')->default(0);
            $table->timestamps();

            $table->unique(['organization_id', 'month_key'], 'str_usage_org_month_uidx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('streaming_monthly_usages');
    }
};
