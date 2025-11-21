<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('volunteer_timesheets', function (Blueprint $table) {
            // Increase precision to support hours, minutes, seconds accurately
            // decimal(10, 6) allows up to 9999.999999 hours with 6 decimal places
            // This gives us precision down to the second (1 second = 0.000278 hours)
            $table->decimal('hours', 10, 6)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('volunteer_timesheets', function (Blueprint $table) {
            $table->decimal('hours', 8, 2)->change();
        });
    }
};
