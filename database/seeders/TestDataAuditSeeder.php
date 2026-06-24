<?php

namespace Database\Seeders;

use App\Services\TestData\TestDataAuditService;
use Illuminate\Database\Seeder;

/**
 * Audit seeded / test / sandbox-linked accounts and count associated financial records.
 *
 * Safe default: report only.
 * Set TEST_DATA_PURGE=true in .env to also delete matched test data when running this seeder.
 *
 * Prefer: php artisan test-data:audit
 * Purge:  php artisan test-data:audit --delete --force
 */
class TestDataAuditSeeder extends Seeder
{
    public function run(): void
    {
        $service = app(TestDataAuditService::class);
        $report = $service->audit();

        $this->command?->info('=== Test data audit (seeded / sandbox credentials) ===');
        $env = $report['environment'];
        $this->command?->line('APP_ENV: '.$env['app_env']);
        $this->command?->line('Bridge sandbox (runtime): '.($env['bridge_runtime_sandbox'] ? 'yes' : 'no'));
        $this->command?->line('Stripe key mode: '.($env['stripe_secret_mode'] ?? 'unknown'));

        $summary = $report['summary'];
        $this->command?->newLine();
        $this->command?->table(
            ['Metric', 'Value'],
            [
                ['Test users', $summary['test_users']],
                ['Test organizations', $summary['test_organizations']],
                ['Transactions', $summary['transactions']],
                ['Donations', $summary['donations']],
                ['Bridge integrations', $summary['bridge_integrations']],
                ['Demo USD balance total', number_format($summary['total_usd_balance_on_test_users'], 2)],
            ],
        );

        foreach ($report['users'] as $row) {
            $this->command?->line(sprintf(
                'User #%d %s — txns:%d donations:%d bridge:%d USD:%s BP:%d (%s)',
                $row['id'],
                $row['email'],
                $row['counts']['transactions'],
                ($row['counts']['donations_as_donor'] ?? 0) + ($row['counts']['donations_as_org'] ?? 0),
                $row['counts']['bridge_integrations'],
                number_format($row['balances']['usd_balance'], 2),
                $row['balances']['believe_points'],
                $row['match_reason'],
            ));
        }

        if (filter_var(env('TEST_DATA_PURGE', false), FILTER_VALIDATE_BOOL)) {
            $this->command?->warn('TEST_DATA_PURGE=true — deleting matched test data...');
            $result = $service->purgeTestData();
            $this->command?->table(['Deleted', 'Count'], collect($result['deleted'])->map(fn ($c, $k) => [$k, $c])->values()->all());
        } else {
            $this->command?->comment('Audit only. Run: php artisan test-data:audit --delete');
        }
    }
}
