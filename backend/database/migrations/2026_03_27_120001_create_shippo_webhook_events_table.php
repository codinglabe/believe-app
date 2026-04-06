<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shippo_webhook_events', function (Blueprint $table) {
            $table->id();

            // Shippo doesn't provide a stable event id in the payload we receive,
            // so we idempotency-guard using a hash of the raw JSON body.
            $table->string('payload_hash', 64)->unique();
            $table->string('event_type', 80)->nullable(); // track_updated, etc

            $table->timestamp('received_at')->useCurrent();
            $table->timestamp('processed_at')->nullable();
            $table->string('processing_result', 64)->nullable(); // processed | duplicate | ignored | failed

            $table->longText('payload_json')->nullable();

            $table->text('error_message')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shippo_webhook_events');
    }
};
