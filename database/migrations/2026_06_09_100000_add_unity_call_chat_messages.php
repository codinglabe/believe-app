<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chat_messages', function (Blueprint $table) {
            $table->string('message_type', 32)->default('text')->after('message');
            $table->json('metadata')->nullable()->after('attachments');
        });

        Schema::table('unity_calls', function (Blueprint $table) {
            $table->foreignId('chat_message_id')
                ->nullable()
                ->after('chat_room_id')
                ->constrained('chat_messages')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('unity_calls', function (Blueprint $table) {
            $table->dropConstrainedForeignId('chat_message_id');
        });

        Schema::table('chat_messages', function (Blueprint $table) {
            $table->dropColumn(['message_type', 'metadata']);
        });
    }
};
