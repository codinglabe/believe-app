<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $columnsToDrop = [
                'slug',
                'name',
                'description',
                'quantity',
                'unit_price',
                'admin_owned',
                'owned_by',
                'organization_id',
                'status',
                'sku',
                'type',
                'tags',
            ];

            foreach ($columnsToDrop as $column) {
                if (Schema::hasColumn('products', $column)) {
                    $table->dropColumn($column);
                }
            }


            $table->string('slug')->unique()->nullable();
            $table->string('name')->nullable();
            $table->text('description')->nullable();
            $table->integer('quantity')->default(0);
            $table->decimal('unit_price', 10, 2)->default(0);
            $table->boolean('admin_owned')->default(false);
            $table->enum('owned_by', ['admin', 'organization'])->default('admin');
            $table->unsignedBigInteger('organization_id')->nullable();
            $table->enum('status', ['active', 'inactive', 'archived'])->default('active');
            $table->string('sku')->unique()->nullable();
            $table->enum('type', ['digital', 'physical'])->default('physical');
            $table->string('tags')->nullable();
        });
    }

    public function down(): void
    {
      
    }
};
