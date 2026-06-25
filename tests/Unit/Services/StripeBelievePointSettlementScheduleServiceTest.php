<?php

namespace Tests\Unit\Services;

use App\Services\StripeBelievePointSettlementScheduleService;
use Tests\TestCase;

class StripeBelievePointSettlementScheduleServiceTest extends TestCase
{
    public function test_parse_available_on_from_balance_transaction_payload(): void
    {
        $timestamp = 1_700_000_000;

        $parsed = StripeBelievePointSettlementScheduleService::parseAvailableOnFromBalanceTransactionPayload([
            'id' => 'txn_test',
            'available_on' => $timestamp,
        ]);

        $this->assertNotNull($parsed);
        $this->assertSame($timestamp, $parsed->getTimestamp());
    }

    public function test_parse_available_on_returns_null_when_missing(): void
    {
        $this->assertNull(
            StripeBelievePointSettlementScheduleService::parseAvailableOnFromBalanceTransactionPayload([
                'id' => 'txn_test',
            ])
        );
    }
}
