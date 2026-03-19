<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fundraise_leads', function (Blueprint $table) {
            $table->string('wefunder_project_url', 500)->nullable()->after('project_summary');
        });

        Schema::create('investment_clicks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('fundraise_lead_id')->constrained()->cascadeOnDelete();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('clicked_at');
            $table->timestamps();

            $table->index(['fundraise_lead_id', 'clicked_at']);
            $table->index(['user_id', 'clicked_at']);
        });
    }

    public function down(): void
    {
        Schema::table('fundraise_leads', function (Blueprint $table) {
            $table->dropColumn('wefunder_project_url');
        });
        Schema::dropIfExists('investment_clicks');
    }
};
