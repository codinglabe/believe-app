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
        Schema::create('irs_bmf_records', function (Blueprint $table) {
            $table->id();
            $table->string('ein', 15)->index();
            $table->string('name')->nullable();
            $table->string('ico')->nullable();
            $table->string('street')->nullable();
            $table->string('city')->nullable();
            $table->string('state', 2)->nullable();
            $table->string('zip', 10)->nullable();
            $table->string('group')->nullable();
            $table->string('subsection')->nullable();
            $table->string('affiliation')->nullable();
            $table->string('classification')->nullable();
            $table->string('ruling')->nullable();
            $table->string('deductibility')->nullable();
            $table->string('foundation')->nullable();
            $table->string('activity')->nullable();
            $table->string('organization')->nullable();
            $table->string('status')->nullable();
            $table->string('tax_period')->nullable();
            $table->string('asset_cd')->nullable();
            $table->string('income_cd')->nullable();
            $table->string('revenue_amt')->nullable();
            $table->string('ntee_cd')->nullable();
            $table->string('sort_name')->nullable();
            $table->json('raw')->nullable();
            $table->timestamps();
            $table->unique(['ein']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('irs_bmf_records');
    }
};
