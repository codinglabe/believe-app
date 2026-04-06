<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->integer('printify_variant_id')->nullable();
            $table->string('name'); // e.g., "White / S"
            $table->json('attributes')->nullable(); // e.g., {color: "White", size: "S"}
            $table->decimal('price_modifier', 8, 2)->default(0);
            $table->integer('available_quantity')->default(0);
            $table->boolean('is_available')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};
