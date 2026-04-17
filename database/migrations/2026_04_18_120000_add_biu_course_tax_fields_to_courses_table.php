<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->string('course_delivery_type', 16)->nullable()->after('format');
            $table->boolean('has_physical_materials')->nullable()->after('course_delivery_type');
            $table->string('pricing_structure', 16)->nullable()->after('has_physical_materials');
            $table->boolean('requires_shipping')->nullable()->after('pricing_structure');
            $table->boolean('tax_ack_outside_ca')->nullable()->after('requires_shipping');
            $table->boolean('tax_ack_auto_calculate')->nullable()->after('tax_ack_outside_ca');
            $table->string('tax_classification', 24)->nullable()->after('tax_ack_auto_calculate');
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropColumn([
                'course_delivery_type',
                'has_physical_materials',
                'pricing_structure',
                'requires_shipping',
                'tax_ack_outside_ca',
                'tax_ack_auto_calculate',
                'tax_classification',
            ]);
        });
    }
};
