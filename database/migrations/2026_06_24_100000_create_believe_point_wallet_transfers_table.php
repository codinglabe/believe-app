<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('believe_point_wallet_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('bridge_integration_id')->nullable()->constrained('bridge_integrations')->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('status', 32)->default('pending');
            $table->string('bridge_transfer_id')->nullable()->index();
            $table->string('bridge_transfer_state')->nullable();
            $table->string('idempotency_key', 64)->unique();
            $table->text('failure_message')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('believe_point_wallet_transfers');
    }
};
