<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('order_splits')) {
            return;
        }

        Schema::create('order_splits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->decimal('merchant_amount', 12, 2)->default(0);
            $table->decimal('organization_amount', 12, 2)->default(0);
            $table->decimal('biu_amount', 12, 2)->default(0);
            $table->timestamps();

            $table->unique('order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_splits');
    }
};
