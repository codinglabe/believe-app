<?php

namespace Tests\Unit\Http\Controllers\Admin;

use App\Http\Controllers\Admin\TransactionLedgerController;
use App\Models\BelievePointPurchase;
use App\Models\Transaction;
use App\Services\Admin\UnifiedLedgerFlatFileMapper;
use App\Services\Admin\UnifiedLedgerPresenter;
use Illuminate\Support\Carbon;
use ReflectionMethod;
use Tests\TestCase;

class BelievePointsPurchaseLedgerFinancialsTest extends TestCase
{
    public function test_ledger_report_includes_platform_fee_and_stripe_processing_fee_for_bp_purchase(): void
    {
        $transaction = new Transaction([
            'id' => 9001,
            'type' => 'purchase',
            'status' => Transaction::STATUS_COMPLETED,
            'amount' => 25.45,
            'fee' => 0.45,
            'currency' => 'USD',
            'payment_method' => 'stripe_ach',
            'transaction_id' => 'pi_test_bp_ledger',
            'related_id' => 42,
            'related_type' => BelievePointPurchase::class,
            'created_at' => Carbon::parse('2026-06-30 12:00:00'),
            'meta' => [
                'source' => 'believe_points_purchase',
                'base_points_usd' => 25.0,
                'checkout_total_usd' => 25.45,
                'gross_amount' => 25.45,
                'platform_fee' => 0.25,
                'processing_fee_estimate' => 0.20,
                'payment_rail' => 'bank',
            ],
        ]);

        $report = $this->invokeLedgerReportFinancials($transaction);

        $this->assertSame(25.45, $report['gross_amount']);
        $this->assertSame(0.20, $report['stripe_fee']);
        $this->assertSame(0.25, $report['biu_fee']);
        $this->assertSame(25.0, $report['net_to_organization']);
        $this->assertSame(0.25, $report['platform_payout']);
    }

    public function test_flat_file_export_maps_platform_fee_column_for_bp_purchase(): void
    {
        $transaction = Transaction::make([
            'id' => 9002,
            'type' => 'purchase',
            'status' => Transaction::STATUS_COMPLETED,
            'amount' => 25.45,
            'fee' => 0.45,
            'currency' => 'USD',
            'payment_method' => 'stripe_ach',
            'transaction_id' => 'pi_test_bp_export',
            'related_id' => 43,
            'related_type' => BelievePointPurchase::class,
            'processed_at' => '2026-06-30 12:00:00',
            'created_at' => '2026-06-30 12:00:00',
            'meta' => [
                'source' => 'believe_points_purchase',
                'base_points_usd' => 25.0,
                'checkout_total_usd' => 25.45,
                'gross_amount' => 25.45,
                'platform_fee' => 0.25,
                'processing_fee_estimate' => 0.20,
            ],
        ]);

        $fin = $this->invokeLedgerReportFinancials($transaction);
        $report = array_merge([
            'source_type' => 'believe_points_purchase',
            'date' => Carbon::parse('2026-06-30 12:00:00')->toIso8601String(),
            'reference' => 'pi_test_bp_export',
            'stripe_mode' => 'unknown',
            'organization_id' => null,
            'organization_name' => null,
            'organization_ein' => null,
            'subtotal_amount' => null,
            'sales_tax_amount' => null,
            'shipping_amount' => null,
            'supplier_payout' => null,
            'organization_payout' => null,
            'supporter_payout' => null,
            'supplier_name' => null,
            'supplier_type' => null,
        ], $fin);
        $presenter = app(UnifiedLedgerPresenter::class);
        $unified = $presenter->present($transaction, $report, null, null, [
            'related_kind' => 'believe_points_purchase',
            'related_label' => 'Believe Points purchase #43',
            'related_display_name' => 'Believe Points purchase #43',
        ]);

        $flat = (new UnifiedLedgerFlatFileMapper)->map($transaction, $unified);

        $this->assertSame('0.20', $flat['payment_processing_fee']);
        $this->assertSame('0.25', $flat['platform_fee_amount']);
        $this->assertSame('25.00', $flat['net_amount']);
    }

    /**
     * @return array<string, mixed>
     */
    private function invokeLedgerReportFinancials(Transaction $transaction): array
    {
        $controller = app(TransactionLedgerController::class);
        $method = new ReflectionMethod(TransactionLedgerController::class, 'ledgerReportFinancials');
        $method->setAccessible(true);

        /** @var array<string, mixed> $report */
        $report = $method->invoke($controller, $transaction, null);

        return $report;
    }
}
