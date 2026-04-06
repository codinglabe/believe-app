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
        Schema::table('newsletter_templates', function (Blueprint $table) {
            $table->enum('frequency_limit', ['none', 'daily', 'weekly', 'monthly', 'custom'])->default('none')->after('is_active');
            $table->integer('custom_frequency_days')->nullable()->after('frequency_limit');
            $table->text('frequency_notes')->nullable()->after('custom_frequency_days');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('newsletter_templates', function (Blueprint $table) {
            $table->dropColumn(['frequency_limit', 'custom_frequency_days', 'frequency_notes']);
        });
    }
};
