<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('newsletters', function (Blueprint $table) {
            $table->dropForeign(['newsletter_template_id']);
        });

        Schema::table('newsletters', function (Blueprint $table) {
            $table->unsignedBigInteger('newsletter_template_id')->nullable()->change();
        });

        Schema::table('newsletters', function (Blueprint $table) {
            $table->foreign('newsletter_template_id')
                ->references('id')
                ->on('newsletter_templates')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('newsletters', function (Blueprint $table) {
            $table->dropForeign(['newsletter_template_id']);
        });

        Schema::table('newsletters', function (Blueprint $table) {
            $table->unsignedBigInteger('newsletter_template_id')->nullable(false)->change();
        });

        Schema::table('newsletters', function (Blueprint $table) {
            $table->foreign('newsletter_template_id')
                ->references('id')
                ->on('newsletter_templates')
                ->onDelete('cascade');
        });
    }
};
