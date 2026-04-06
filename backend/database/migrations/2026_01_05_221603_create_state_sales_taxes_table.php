<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('state_sales_taxes', function (Blueprint $table) {
            $table->id();
            $table->string('state', 50)->unique();
            $table->string('state_code', 2)->unique();
            $table->decimal('base_sales_tax_rate', 5, 2)->default(0);
            $table->boolean('local_rates_apply')->default(false);
            $table->string('last_updated', 10)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('state_code');
        });

        // Insert state sales tax data
        $states = [
            ['Alabama', 'AL', 4.00, true, '2026-01', 'Local county and city taxes may apply'],
            ['Alaska', 'AK', 0.00, true, '2026-01', 'No state tax; local taxes may apply'],
            ['Arizona', 'AZ', 5.60, true, '2026-01', 'Local taxes may apply'],
            ['Arkansas', 'AR', 6.50, true, '2026-01', 'Local taxes may apply'],
            ['California', 'CA', 7.25, true, '2026-01', 'Local district taxes may apply'],
            ['Colorado', 'CO', 2.90, true, '2026-01', 'Local taxes may apply'],
            ['Connecticut', 'CT', 6.35, false, '2026-01', 'Statewide rate'],
            ['Delaware', 'DE', 0.00, false, '2026-01', 'No sales tax'],
            ['District of Columbia', 'DC', 6.00, false, '2026-01', 'Statewide rate'],
            ['Florida', 'FL', 6.00, true, '2026-01', 'Discretionary sales surtax may apply'],
            ['Georgia', 'GA', 4.00, true, '2026-01', 'Local taxes may apply'],
            ['Hawaii', 'HI', 4.00, true, '2026-01', 'General excise tax; local surcharge may apply'],
            ['Idaho', 'ID', 6.00, true, '2026-01', 'Local taxes may apply'],
            ['Illinois', 'IL', 6.25, true, '2026-01', 'Local taxes may apply'],
            ['Indiana', 'IN', 7.00, false, '2026-01', 'Statewide rate'],
            ['Iowa', 'IA', 6.00, true, '2026-01', 'Local taxes may apply'],
            ['Kansas', 'KS', 6.50, true, '2026-01', 'Local taxes may apply'],
            ['Kentucky', 'KY', 6.00, false, '2026-01', 'Statewide rate'],
            ['Louisiana', 'LA', 4.45, true, '2026-01', 'Local taxes may apply'],
            ['Maine', 'ME', 5.50, false, '2026-01', 'Statewide rate'],
            ['Maryland', 'MD', 6.00, false, '2026-01', 'Statewide rate'],
            ['Massachusetts', 'MA', 6.25, false, '2026-01', 'Statewide rate'],
            ['Michigan', 'MI', 6.00, false, '2026-01', 'Statewide rate'],
            ['Minnesota', 'MN', 6.88, true, '2026-01', 'Local taxes may apply'],
            ['Mississippi', 'MS', 7.00, true, '2026-01', 'Local taxes may apply'],
            ['Missouri', 'MO', 4.23, true, '2026-01', 'Local taxes may apply'],
            ['Montana', 'MT', 0.00, true, '2026-01', 'No state tax; local taxes may apply'],
            ['Nebraska', 'NE', 5.50, true, '2026-01', 'Local taxes may apply'],
            ['Nevada', 'NV', 6.85, true, '2026-01', 'Local taxes may apply'],
            ['New Hampshire', 'NH', 0.00, false, '2026-01', 'No sales tax'],
            ['New Jersey', 'NJ', 6.63, true, '2026-01', 'Reduced rates may apply'],
            ['New Mexico', 'NM', 5.13, true, '2026-01', 'Gross receipts tax; local rates may apply'],
            ['New York', 'NY', 4.00, true, '2026-01', 'Local taxes may apply'],
            ['North Carolina', 'NC', 4.75, true, '2026-01', 'Local taxes may apply'],
            ['North Dakota', 'ND', 5.00, true, '2026-01', 'Local taxes may apply'],
            ['Ohio', 'OH', 5.75, true, '2026-01', 'Local taxes may apply'],
            ['Oklahoma', 'OK', 4.50, true, '2026-01', 'Local taxes may apply'],
            ['Oregon', 'OR', 0.00, false, '2026-01', 'No sales tax'],
            ['Pennsylvania', 'PA', 6.00, true, '2026-01', 'Local taxes may apply'],
            ['Rhode Island', 'RI', 7.00, false, '2026-01', 'Statewide rate'],
            ['South Carolina', 'SC', 6.00, true, '2026-01', 'Local taxes may apply'],
            ['South Dakota', 'SD', 4.20, true, '2026-01', 'Local taxes may apply'],
            ['Tennessee', 'TN', 7.00, true, '2026-01', 'Local taxes may apply'],
            ['Texas', 'TX', 6.25, true, '2026-01', 'Local taxes may apply'],
            ['Utah', 'UT', 4.85, true, '2026-01', 'Local taxes may apply'],
            ['Vermont', 'VT', 6.00, true, '2026-01', 'Local taxes may apply'],
            ['Virginia', 'VA', 5.30, true, '2026-01', 'Local taxes may apply'],
            ['Washington', 'WA', 6.50, true, '2026-01', 'Local taxes may apply'],
            ['West Virginia', 'WV', 6.00, true, '2026-01', 'Local taxes may apply'],
            ['Wisconsin', 'WI', 5.00, true, '2026-01', 'Local taxes may apply'],
            ['Wyoming', 'WY', 4.00, true, '2026-01', 'Local taxes may apply'],
        ];

        foreach ($states as $state) {
            DB::table('state_sales_taxes')->insert([
                'state' => $state[0],
                'state_code' => $state[1],
                'base_sales_tax_rate' => $state[2],
                'local_rates_apply' => $state[3],
                'last_updated' => $state[4],
                'notes' => $state[5],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('state_sales_taxes');
    }
};
