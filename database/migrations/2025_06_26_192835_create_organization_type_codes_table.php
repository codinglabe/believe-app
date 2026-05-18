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
        Schema::create('organization_type_codes', function (Blueprint $table) {
            $table->id();
            $table->integer("organization_code")->unique(); // Unique code for the organization type
            $table->string("organization_structure"); // Type of organization structure (e.g., Corporation, Partnership)
            $table->text("description");
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('organization_type_codes');
    }
};
