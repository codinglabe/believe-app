<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('believe_point_purchases', function (Blueprint $table) {
            $table->string('failure_code')->nullable()->after('source');
            $table->text('failure_message')->nullable()->after('failure_code');
        });
    }

    public function down(): void
    {
        Schema::table('believe_point_purchases', function (Blueprint $table) {
            $table->dropColumn(['failure_code', 'failure_message']);
        });
    }
};
