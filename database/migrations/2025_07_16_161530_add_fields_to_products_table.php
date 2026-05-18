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
                'image',
                'user_id',
                'price',
                'quantity_ordered',
                'quantity_available'
            ];

            foreach ($columnsToDrop as $column) {
                if (Schema::hasColumn('products', $column)) {
                    $table->dropColumn($column);
                }
            }
            $table->string('image')->unique()->nullable();
            $table->integer('quantity_ordered')->default(0);
            $table->integer('quantity_available')->default(0);
        });
    }

    public function down(): void
    {

    }
};
