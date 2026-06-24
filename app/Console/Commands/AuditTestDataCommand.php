<?php

namespace App\Console\Commands;

use App\Services\TestData\TestDataAuditService;
use Illuminate\Console\Command;

class AuditTestDataCommand extends Command
{
    protected $signature = 'test-data:audit
                            {--delete : Delete matched test/sandbox financial + Bridge data and test accounts}
                            {--force : Skip confirmation prompts}
                            {--json : Output full report as JSON}
                            {--user-id= : Audit a single user by ID}
                            {--email= : Audit a single user by email}
                            {--organization-id= : Audit a single organization by ID}';

    protected $description = 'Audit seeded/test/sandbox users and count (or purge) associated wallet, Bridge, Stripe, and donation records';

    public function handle(TestDataAuditService $service): int
    {
        $userId = $this->option('user-id') ? (int) $this->option('user-id') : null;
        $organizationId = $this->option('organization-id') ? (int) $this->option('organization-id') : null;
        $email = $this->option('email') ?: null;

        if ($this->option('delete')) {
            return $this->runPurge($service, $userId, $email, $organizationId);
        }

        $report = $service->audit($userId, $email, $organizationId);

        if ($this->option('json')) {
            $this->line(json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            return self::SUCCESS;
        }

        $this->printEnvironment($report['environment']);
        $this->printSummary($report['summary']);

        if ($report['users'] !== []) {
            $this->newLine();
            $this->info('=== Test users ===');
            $this->table(
                ['ID', 'Email', 'Role', 'USD', 'BP', 'Txns', 'Donations', 'Bridge', 'Reason'],
                collect($report['users'])->map(fn (array $row) => [
                    $row['id'],
                    $row['email'],
                    $row['role'],
                    number_format($row['balances']['usd_balance'], 2),
                    $row['balances']['believe_points'],
                    $row['counts']['transactions'],
                    ($row['counts']['donations_as_donor'] ?? 0) + ($row['counts']['donations_as_org'] ?? 0),
                    $row['counts']['bridge_integrations'],
                    $row['match_reason'],
                ])->all(),
            );
        }

        if ($report['organizations'] !== []) {
            $this->newLine();
            $this->info('=== Test organizations ===');
            $this->table(
                ['ID', 'Name', 'EIN', 'Owner', 'Donations', 'Bridge', 'Reason'],
                collect($report['organizations'])->map(fn (array $row) => [
                    $row['id'],
                    $row['name'],
                    $row['ein'],
                    $row['owner_email'] ?? '—',
                    $row['counts']['donations_as_org'] ?? 0,
                    $row['counts']['bridge_integrations'],
                    $row['match_reason'],
                ])->all(),
            );
        }

        if ($report['merchants'] !== []) {
            $this->newLine();
            $this->info('=== Test merchants ===');
            $this->table(
                ['ID', 'Email', 'Business', 'Products'],
                collect($report['merchants'])->map(fn (array $row) => [
                    $row['id'],
                    $row['email'],
                    $row['business_name'],
                    $row['counts']['marketplace_products'],
                ])->all(),
            );
        }

        $this->newLine();
        $this->comment('Run with --delete to remove matched test data (blocked on production unless TEST_DATA_PURGE=true).');
        $this->comment('Patterns: config/test-data-audit.php');

        return self::SUCCESS;
    }

    private function runPurge(
        TestDataAuditService $service,
        ?int $userId,
        ?string $email,
        ?int $organizationId,
    ): int {
        $preview = $service->audit($userId, $email, $organizationId);

        $this->warn('This will DELETE financial + Bridge records and test accounts matched below.');
        $this->printSummary($preview['summary']);

        if (! $service->purgeAllowed()) {
            $this->error('Purge blocked: APP_ENV='.config('app.env').'. Set TEST_DATA_PURGE=true only on a non-live database.');

            return self::FAILURE;
        }

        if (! $this->option('force') && ! $this->confirm('Delete all matched test data?', false)) {
            $this->info('Cancelled.');

            return self::SUCCESS;
        }

        $result = $service->purgeTestData($userId, $email, $organizationId);

        $this->newLine();
        $this->info('=== Deleted ===');
        $this->table(
            ['Resource', 'Count'],
            collect($result['deleted'])->map(fn ($count, $key) => [$key, $count])->values()->all(),
        );

        return self::SUCCESS;
    }

    /** @param  array<string, mixed>  $environment */
    private function printEnvironment(array $environment): void
    {
        $this->info('=== Current payment environment (global) ===');
        $this->table(
            ['Setting', 'Value'],
            [
                ['APP_ENV', $environment['app_env']],
                ['APP_URL', $environment['app_url']],
                ['Bridge DB mode', $environment['bridge_db_mode'] ?? '—'],
                ['Bridge runtime sandbox', $environment['bridge_runtime_sandbox'] ? 'yes' : 'no'],
                ['Stripe DB mode', $environment['stripe_db_mode'] ?? '—'],
                ['Stripe secret key type', $environment['stripe_secret_mode'] ?? '—'],
            ],
        );
        $this->comment('Note: individual donations/transactions are NOT tagged sandbox vs live in the database.');
    }

    /** @param  array<string, mixed>  $summary */
    private function printSummary(array $summary): void
    {
        $this->newLine();
        $this->info('=== Totals for matched test entities ===');
        $this->table(
            ['Metric', 'Count / Amount'],
            [
                ['Test users', $summary['test_users']],
                ['Test organizations', $summary['test_organizations']],
                ['Test merchants', $summary['test_merchants']],
                ['USD balance on test users', number_format($summary['total_usd_balance_on_test_users'], 2)],
                ['Believe Points on test users', $summary['total_believe_points_on_test_users']],
                ['Wallet transactions', $summary['transactions']],
                ['Donations', $summary['donations']],
                ['Payment transactions', $summary['payment_transactions']],
                ['Believe Point purchases', $summary['believe_point_purchases']],
                ['Bridge integrations', $summary['bridge_integrations']],
                ['Bridge wallets', $summary['bridge_wallets']],
            ],
        );
    }
}
