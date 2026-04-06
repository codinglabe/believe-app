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
        Schema::create('email_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('email_connection_id')->constrained('email_connections')->onDelete('cascade');
            $table->foreignId('organization_id')->constrained('organizations')->onDelete('cascade');
            $table->string('email');
            $table->string('name')->nullable();
            $table->string('provider_contact_id')->nullable(); // Gmail/Outlook contact ID
            $table->json('metadata')->nullable(); // Additional contact info
            $table->boolean('invite_sent')->default(false);
            $table->timestamp('invite_sent_at')->nullable();
            $table->boolean('has_joined')->default(false);
            $table->timestamp('joined_at')->nullable();
            $table->timestamps();
            
            $table->index(['organization_id', 'email']);
            $table->index(['email_connection_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('email_contacts');
    }
};
