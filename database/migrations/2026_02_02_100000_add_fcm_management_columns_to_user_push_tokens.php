<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_push_tokens', function (Blueprint $table) {
            $table->string('status', 20)->default('active')->after('is_active'); // active, invalid, opted_out
            $table->text('last_error')->nullable()->after('status');
            $table->timestamp('last_error_at')->nullable()->after('last_error');
            $table->boolean('needs_reregister')->default(false)->after('last_error_at');
        });
    }

    public function down(): void
    {
        Schema::table('user_push_tokens', function (Blueprint $table) {
            $table->dropColumn(['status', 'last_error', 'last_error_at', 'needs_reregister']);
        });
    }
};
