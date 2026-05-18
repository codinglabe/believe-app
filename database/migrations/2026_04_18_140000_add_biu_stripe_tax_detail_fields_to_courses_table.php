<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->string('course_content_type', 40)->nullable()->after('tax_classification');
            $table->decimal('digital_course_fee', 10, 2)->nullable()->after('course_content_type');
            $table->decimal('materials_fee', 10, 2)->nullable()->after('digital_course_fee');
            $table->decimal('shipping_fee_amount', 10, 2)->nullable()->after('materials_fee');
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropColumn([
                'course_content_type',
                'digital_course_fee',
                'materials_fee',
                'shipping_fee_amount',
            ]);
        });
    }
};
