<?php

namespace App\Services\TestData;

use App\Models\AssociatedPerson;
use App\Models\BelievePointPurchase;
use App\Models\BelievePointWalletTransfer;
use App\Models\BelievePointsLedgerEntry;
use App\Models\BridgeIntegration;
use App\Models\BridgeKycKybSubmission;
use App\Models\BridgeWallet;
use App\Models\CardWallet;
use App\Models\ControlPerson;
use App\Models\Donation;
use App\Models\GiftCard;
use App\Models\LiquidationAddress;
use App\Models\Merchant;
use App\Models\Organization;
use App\Models\PaymentMethod;
use App\Models\PaymentTransaction;
use App\Models\Transaction;
use App\Models\User;
use App\Models\VerificationDocument;
use App\Services\BridgeService;
use App\Services\StripeConfigService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class TestDataAuditService
{
    /** @return array<string, mixed> */
    public function environmentReport(): array
    {
        $bridgeConfig = PaymentMethod::getConfig('bridge');
        $stripeConfig = PaymentMethod::getConfig('stripe');

        $stripeEnv = StripeConfigService::getEnvironment();
        $stripeCreds = StripeConfigService::getCredentials($stripeEnv);

        return [
            'app_env' => config('app.env'),
            'app_url' => config('app.url'),
            'bridge_db_mode' => $bridgeConfig?->mode_environment,
            'bridge_env_fallback' => config('services.bridge.environment'),
            'bridge_runtime_sandbox' => app(BridgeService::class)->isSandbox(),
            'stripe_db_mode' => $stripeConfig?->mode_environment ?? $stripeEnv,
            'stripe_secret_mode' => $this->inferStripeKeyMode($stripeCreds['secret_key'] ?? env('STRIPE_SECRET')),
        ];
    }

    /** @return Collection<int, User> */
    public function findTestUsers(?int $userId = null, ?string $email = null): Collection
    {
        $query = User::query();

        if ($userId) {
            return $query->whereKey($userId)->get();
        }

        if ($email) {
            return $query->where('email', $email)->get();
        }

        $patterns = config('test-data-audit.user_email_patterns', []);
        $exact = config('test-data-audit.user_email_exact', []);

        return $query->where(function (Builder $q) use ($patterns, $exact): void {
            foreach ($exact as $value) {
                $q->orWhere('email', $value);
            }
            foreach ($patterns as $pattern) {
                $q->orWhere('email', 'like', $pattern);
            }
        })->orderBy('id')->get();
    }

    /** @return Collection<int, Organization> */
    public function findTestOrganizations(?int $organizationId = null): Collection
    {
        if ($organizationId) {
            return Organization::query()->whereKey($organizationId)->get();
        }

        $eins = config('test-data-audit.organization_eins', []);
        $namePatterns = config('test-data-audit.organization_name_patterns', []);
        $einPatterns = config('test-data-audit.organization_ein_patterns', []);

        return Organization::query()
            ->where(function (Builder $q) use ($eins, $namePatterns, $einPatterns): void {
                if ($eins !== []) {
                    $q->orWhereIn('ein', $eins);
                }
                foreach ($namePatterns as $pattern) {
                    $q->orWhere('name', 'like', $pattern);
                }
                foreach ($einPatterns as $pattern) {
                    $q->orWhere('ein', 'like', $pattern);
                }
            })
            ->orderBy('id')
            ->get();
    }

    /** @return Collection<int, Merchant> */
    public function findTestMerchants(): Collection
    {
        $patterns = ['%@test.com', '%@merchant.com'];
        $exact = ['merchant@test.com', 'admin@merchant.com'];

        return Merchant::query()
            ->where(function (Builder $q) use ($patterns, $exact): void {
                foreach ($exact as $value) {
                    $q->orWhere('email', $value);
                }
                foreach ($patterns as $pattern) {
                    $q->orWhere('email', 'like', $pattern);
                }
            })
            ->orderBy('id')
            ->get();
    }

    /** @return array<string, mixed> */
    public function audit(?int $userId = null, ?string $email = null, ?int $organizationId = null): array
    {
        $users = $this->findTestUsers($userId, $email);
        $organizations = $this->findTestOrganizations($organizationId);
        $merchants = $this->findTestMerchants();

        $userRows = $users->map(fn (User $user) => $this->auditUser($user))->values()->all();
        $orgRows = $organizations->map(fn (Organization $org) => $this->auditOrganization($org))->values()->all();
        $merchantRows = $merchants->map(fn (Merchant $merchant) => $this->auditMerchant($merchant))->values()->all();

        return [
            'environment' => $this->environmentReport(),
            'summary' => $this->buildSummary($userRows, $orgRows, $merchantRows),
            'users' => $userRows,
            'organizations' => $orgRows,
            'merchants' => $merchantRows,
        ];
    }

    /** @return array<string, mixed> */
    public function auditUser(User $user): array
    {
        $org = Organization::query()->where('user_id', $user->id)->first();
        $orgIds = Organization::query()->where('user_id', $user->id)->pluck('id');

        $integrations = $this->bridgeIntegrationsForUser($user);

        return [
            'entity' => 'user',
            'id' => $user->id,
            'email' => $user->email,
            'name' => $user->name,
            'role' => $user->role,
            'balances' => [
                'usd_balance' => (float) ($user->balance ?? 0),
                'believe_points' => (int) ($user->believe_points ?? 0),
                'reward_points' => (int) ($user->reward_points ?? 0),
                'processing_believe_points' => (int) ($user->processing_believe_points ?? 0),
            ],
            'stripe_customer_id' => $user->stripe_id,
            'organization_id' => $org?->id,
            'organization_name' => $org?->name,
            'counts' => array_merge(
                $this->financialCountsForUser($user->id, $orgIds->all()),
                $this->bridgeCounts($integrations),
            ),
            'match_reason' => $this->userMatchReason($user),
        ];
    }

    /** @return array<string, mixed> */
    public function auditOrganization(Organization $org): array
    {
        $integrations = BridgeIntegration::query()
            ->where('integratable_type', Organization::class)
            ->where('integratable_id', $org->id)
            ->get();

        return [
            'entity' => 'organization',
            'id' => $org->id,
            'name' => $org->name,
            'ein' => $org->ein,
            'user_id' => $org->user_id,
            'owner_email' => $org->user?->email,
            'counts' => array_merge(
                [
                    'donations_as_org' => Donation::query()->where('organization_id', $org->id)->count(),
                    'payment_transactions_as_org' => PaymentTransaction::query()->where('organization_id', $org->id)->count(),
                ],
                $this->bridgeCounts($integrations),
            ),
            'match_reason' => $this->organizationMatchReason($org),
        ];
    }

    /** @return array<string, mixed> */
    public function auditMerchant(Merchant $merchant): array
    {
        return [
            'entity' => 'merchant',
            'id' => $merchant->id,
            'email' => $merchant->email,
            'business_name' => $merchant->business_name,
            'stripe_customer_id' => $merchant->stripe_id ?? null,
            'counts' => [
                'marketplace_products' => $merchant->marketplaceProducts()->count(),
                'shipping_addresses' => $merchant->shippingAddresses()->count(),
            ],
            'match_reason' => 'merchant test email pattern',
        ];
    }

    /**
     * Delete financial + Bridge data for all matched test entities (not live users).
     *
     * @return array<string, mixed>
     */
    public function purgeTestData(?int $userId = null, ?string $email = null, ?int $organizationId = null): array
    {
        if (! $this->purgeAllowed()) {
            throw new \RuntimeException(
                'Test data purge is blocked in APP_ENV='.config('app.env').'. '
                .'Set TEST_DATA_PURGE=true and use only on non-production databases.'
            );
        }

        $audit = $this->audit($userId, $email, $organizationId);
        $deleted = [
            'bridge_integrations' => 0,
            'transactions' => 0,
            'donations' => 0,
            'payment_transactions' => 0,
            'believe_point_purchases' => 0,
            'believe_points_ledger_entries' => 0,
            'believe_point_wallet_transfers' => 0,
            'gift_cards' => 0,
            'subscriptions' => 0,
            'organizations' => 0,
            'users' => 0,
            'merchants' => 0,
        ];

        DB::transaction(function () use ($audit, &$deleted): void {
            $testUserIds = collect($audit['users'])->pluck('id')->all();

            foreach ($audit['users'] as $row) {
                $user = User::query()->find($row['id']);
                if (! $user) {
                    continue;
                }

                $deleted = $this->mergeCounts($deleted, $this->purgeUserFinancialAndBridge($user));
            }

            foreach ($audit['organizations'] as $row) {
                if (in_array($row['user_id'], $testUserIds, true)) {
                    continue;
                }

                $org = Organization::query()->find($row['id']);
                if (! $org) {
                    continue;
                }

                $deleted['donations'] += Donation::query()->where('organization_id', $org->id)->delete();
                $deleted['payment_transactions'] += PaymentTransaction::query()->where('organization_id', $org->id)->delete();

                $integrations = BridgeIntegration::query()
                    ->where('integratable_type', Organization::class)
                    ->where('integratable_id', $org->id)
                    ->get();

                $deleted = $this->mergeCounts($deleted, $this->purgeBridgeIntegrations($integrations));

                $org->delete();
                $deleted['organizations']++;
            }

            foreach ($audit['merchants'] as $row) {
                $merchant = Merchant::query()->find($row['id']);
                if ($merchant) {
                    $merchant->delete();
                    $deleted['merchants']++;
                }
            }

            foreach ($audit['users'] as $row) {
                $user = User::query()->find($row['id']);
                if ($user) {
                    $orgCount = Organization::query()->where('user_id', $user->id)->count();
                    Organization::query()->where('user_id', $user->id)->delete();
                    $deleted['organizations'] += $orgCount;
                    $user->delete();
                    $deleted['users']++;
                }
            }
        });

        return [
            'audit_before' => $audit['summary'],
            'deleted' => $deleted,
        ];
    }

    public function purgeAllowed(): bool
    {
        if (filter_var(env('TEST_DATA_PURGE', false), FILTER_VALIDATE_BOOL)) {
            return true;
        }

        return in_array(config('app.env'), config('test-data-audit.allow_purge_envs', []), true);
    }

    /** @param  Collection<int, BridgeIntegration>  $integrations */
    private function bridgeCounts(Collection $integrations): array
    {
        $counts = [
            'bridge_integrations' => $integrations->count(),
            'bridge_kyc_kyb_submissions' => 0,
            'bridge_wallets' => 0,
            'card_wallets' => 0,
            'liquidation_addresses' => 0,
            'verification_documents' => 0,
            'associated_persons' => 0,
            'control_persons' => 0,
        ];

        foreach ($integrations as $integration) {
            $submissions = BridgeKycKybSubmission::query()
                ->where('bridge_integration_id', $integration->id)
                ->pluck('id');

            $counts['bridge_kyc_kyb_submissions'] += $submissions->count();
            $counts['bridge_wallets'] += BridgeWallet::query()->where('bridge_integration_id', $integration->id)->count();
            $counts['card_wallets'] += CardWallet::query()->where('bridge_integration_id', $integration->id)->count();
            $counts['liquidation_addresses'] += LiquidationAddress::query()->where('bridge_integration_id', $integration->id)->count();

            if ($submissions->isNotEmpty()) {
                $counts['associated_persons'] += AssociatedPerson::query()->whereIn('bridge_kyc_kyb_submission_id', $submissions)->count();
                $counts['control_persons'] += ControlPerson::query()->whereIn('bridge_kyc_kyb_submission_id', $submissions)->count();
                $counts['verification_documents'] += VerificationDocument::query()->whereIn('bridge_kyc_kyb_submission_id', $submissions)->count();
            }
        }

        return $counts;
    }

    /** @param  array<int>  $organizationIds */
    private function financialCountsForUser(int $userId, array $organizationIds): array
    {
        $counts = [
            'transactions' => Transaction::query()->where('user_id', $userId)->count(),
            'donations_as_donor' => Donation::query()->where('user_id', $userId)->count(),
            'donations_as_org' => $organizationIds === []
                ? 0
                : Donation::query()->whereIn('organization_id', $organizationIds)->count(),
            'payment_transactions' => PaymentTransaction::query()->where('user_id', $userId)->count(),
            'believe_point_purchases' => BelievePointPurchase::query()->where('user_id', $userId)->count(),
            'believe_points_ledger_entries' => BelievePointsLedgerEntry::query()->where('user_id', $userId)->count(),
            'believe_point_wallet_transfers' => BelievePointWalletTransfer::query()->where('user_id', $userId)->count(),
            'gift_cards' => GiftCard::query()->where('user_id', $userId)->count(),
            'subscriptions' => 0,
        ];

        if (Schema::hasTable('subscriptions')) {
            $counts['subscriptions'] = (int) DB::table('subscriptions')
                ->where('user_id', $userId)
                ->where('user_type', User::class)
                ->count();
        }

        return $counts;
    }

    /** @return Collection<int, BridgeIntegration> */
    private function bridgeIntegrationsForUser(User $user): Collection
    {
        $integrations = BridgeIntegration::query()
            ->where('integratable_type', User::class)
            ->where('integratable_id', $user->id)
            ->get();

        foreach (Organization::query()->where('user_id', $user->id)->pluck('id') as $orgId) {
            $orgIntegrations = BridgeIntegration::query()
                ->where('integratable_type', Organization::class)
                ->where('integratable_id', $orgId)
                ->get();

            $integrations = $integrations->merge($orgIntegrations);
        }

        return $integrations->unique('id')->values();
    }

    /** @return array<string, int> */
    private function purgeUserFinancialAndBridge(User $user): array
    {
        $orgIds = Organization::query()->where('user_id', $user->id)->pluck('id')->all();
        $integrationIds = $this->bridgeIntegrationsForUser($user);

        $deleted = [
            'bridge_integrations' => 0,
            'transactions' => Transaction::query()->where('user_id', $user->id)->delete(),
            'donations' => Donation::query()->where('user_id', $user->id)->delete(),
            'payment_transactions' => PaymentTransaction::query()->where('user_id', $user->id)->delete(),
            'believe_point_purchases' => BelievePointPurchase::query()->where('user_id', $user->id)->delete(),
            'believe_points_ledger_entries' => BelievePointsLedgerEntry::query()->where('user_id', $user->id)->delete(),
            'believe_point_wallet_transfers' => BelievePointWalletTransfer::query()->where('user_id', $user->id)->delete(),
            'gift_cards' => GiftCard::query()->where('user_id', $user->id)->delete(),
            'subscriptions' => 0,
            'organizations' => 0,
            'users' => 0,
            'merchants' => 0,
        ];

        if ($orgIds !== []) {
            $deleted['donations'] += Donation::query()->whereIn('organization_id', $orgIds)->delete();
            $deleted['payment_transactions'] += PaymentTransaction::query()->whereIn('organization_id', $orgIds)->delete();
        }

        if (Schema::hasTable('subscriptions')) {
            $deleted['subscriptions'] = (int) DB::table('subscriptions')
                ->where('user_id', $user->id)
                ->where('user_type', User::class)
                ->delete();
        }

        $user->forceFill([
            'balance' => 0,
            'believe_points' => 0,
            'reward_points' => 0,
            'processing_believe_points' => 0,
            'gifted_believe_points' => 0,
            'stripe_id' => null,
            'pm_type' => null,
            'pm_last_four' => null,
        ])->save();

        return $this->mergeCounts($deleted, $this->purgeBridgeIntegrations($integrationIds));
    }

    /** @param  Collection<int, BridgeIntegration>  $integrations */
    private function purgeBridgeIntegrations(Collection $integrations): array
    {
        $deleted = [
            'bridge_integrations' => 0,
            'transactions' => 0,
            'donations' => 0,
            'payment_transactions' => 0,
            'believe_point_purchases' => 0,
            'believe_points_ledger_entries' => 0,
            'believe_point_wallet_transfers' => 0,
            'gift_cards' => 0,
            'subscriptions' => 0,
            'organizations' => 0,
            'users' => 0,
            'merchants' => 0,
        ];

        foreach ($integrations as $integration) {
            $submissions = BridgeKycKybSubmission::query()
                ->where('bridge_integration_id', $integration->id)
                ->pluck('id');

            if ($submissions->isNotEmpty()) {
                AssociatedPerson::query()->whereIn('bridge_kyc_kyb_submission_id', $submissions)->delete();
                ControlPerson::query()->whereIn('bridge_kyc_kyb_submission_id', $submissions)->delete();

                $docs = VerificationDocument::query()->whereIn('bridge_kyc_kyb_submission_id', $submissions)->get();
                foreach ($docs as $doc) {
                    if ($doc->file_path) {
                        $fullPath = 'public/'.$doc->file_path;
                        if (Storage::exists($fullPath)) {
                            Storage::delete($fullPath);
                        }
                    }
                }
                VerificationDocument::query()->whereIn('bridge_kyc_kyb_submission_id', $submissions)->delete();
            }

            BridgeKycKybSubmission::query()->where('bridge_integration_id', $integration->id)->delete();
            LiquidationAddress::query()->where('bridge_integration_id', $integration->id)->delete();
            CardWallet::query()->where('bridge_integration_id', $integration->id)->delete();
            BridgeWallet::query()->where('bridge_integration_id', $integration->id)->delete();
            $integration->delete();
            $deleted['bridge_integrations']++;
        }

        return $deleted;
    }

    /** @param  array<string, int>  $a  @param  array<string, int>  $b */
    private function mergeCounts(array $a, array $b): array
    {
        foreach ($b as $key => $value) {
            $a[$key] = ($a[$key] ?? 0) + $value;
        }

        return $a;
    }

    private function userMatchReason(User $user): string
    {
        $exact = config('test-data-audit.user_email_exact', []);
        if (in_array($user->email, $exact, true)) {
            return 'seeded test email (exact match)';
        }

        return 'test email pattern match';
    }

    private function organizationMatchReason(Organization $org): string
    {
        $testUserIds = $this->findTestUsers()->pluck('id')->all();
        if (in_array($org->user_id, $testUserIds, true)) {
            return 'owned by matched test user';
        }

        if (in_array($org->ein, config('test-data-audit.organization_eins', []), true)) {
            return 'seeded test EIN';
        }

        return 'test org name/EIN pattern';
    }

    private function inferStripeKeyMode(?string $secret): ?string
    {
        if (! $secret) {
            return null;
        }

        if (str_starts_with($secret, 'sk_live_')) {
            return 'live';
        }
        if (str_starts_with($secret, 'sk_test_')) {
            return 'test';
        }

        return 'unknown';
    }

    /** @param  array<int, array<string, mixed>>  $userRows */
    private function buildSummary(array $userRows, array $orgRows, array $merchantRows): array
    {
        $sum = static fn (array $rows, string $key): int => array_sum(array_map(
            fn (array $row) => (int) ($row['counts'][$key] ?? 0),
            $rows,
        ));

        $allRows = array_merge($userRows, $orgRows);

        return [
            'test_users' => count($userRows),
            'test_organizations' => count($orgRows),
            'test_merchants' => count($merchantRows),
            'total_usd_balance_on_test_users' => array_sum(array_map(
                fn (array $row) => (float) ($row['balances']['usd_balance'] ?? 0),
                $userRows,
            )),
            'total_believe_points_on_test_users' => array_sum(array_map(
                fn (array $row) => (int) ($row['balances']['believe_points'] ?? 0),
                $userRows,
            )),
            'transactions' => $sum($userRows, 'transactions'),
            'donations' => $sum($userRows, 'donations_as_donor') + $sum($allRows, 'donations_as_org'),
            'payment_transactions' => $sum($userRows, 'payment_transactions') + $sum($orgRows, 'payment_transactions_as_org'),
            'believe_point_purchases' => $sum($userRows, 'believe_point_purchases'),
            'bridge_integrations' => $sum($allRows, 'bridge_integrations'),
            'bridge_wallets' => $sum($allRows, 'bridge_wallets'),
        ];
    }
}
