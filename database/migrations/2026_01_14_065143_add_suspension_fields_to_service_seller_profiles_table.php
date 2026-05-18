<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('service_seller_profiles', function (Blueprint $table) {
            $table->boolean('is_suspended')->default(false);
            $table->timestamp('suspended_at')->nullable();
            $table->text('suspension_reason')->nullable();
            $table->foreignId('suspended_by')->nullable()->constrained('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('service_seller_profiles', function (Blueprint $table) {
            $table->dropColumn(['is_suspended', 'suspended_at', 'suspension_reason', 'suspended_by']);
        });
    }
};
