<?php

namespace App\Services;

use App\Models\BridgeIntegration;
use App\Models\CardWallet;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Cashier;
use Stripe\Exception\ApiErrorException;
use Stripe\Issuing\Card;

class BridgeStripeIssuingService
{
    public function __construct(
        protected BridgeService $bridgeService,
    ) {}

    /**
     * Fetch an issued virtual card for display (Stripe Issuing first, legacy Bridge fallback).
     */
    public function getVirtualCard(BridgeIntegration $integration, string $customerId): array
    {
        $customerResult = $this->bridgeService->getCustomer($customerId);
        $customerData = ($customerResult['success'] ?? false) ? ($customerResult['data'] ?? []) : [];

        $existing = $this->findExistingStripeCard($integration, $customerData);
        if ($existing) {
            return [
                'success' => true,
                'has_card' => true,
                'data' => $existing,
                'source' => 'stripe_issuing',
            ];
        }

        $legacy = $this->bridgeService->getCardAccounts($customerId);
        if ($legacy['success'] ?? false) {
            $cardAccounts = is_array($legacy['data']['data'] ?? null)
                ? $legacy['data']['data']
                : (is_array($legacy['data'] ?? null) ? $legacy['data'] : []);

            if (! empty($cardAccounts[0])) {
                return [
                    'success' => true,
                    'has_card' => true,
                    'data' => $cardAccounts[0],
                    'source' => 'bridge_legacy',
                ];
            }
        }

        return [
            'success' => true,
            'has_card' => false,
            'data' => null,
        ];
    }

    /**
     * Issue a virtual card via Stripe Issuing (Bridge + Stripe sandbox integration).
     *
     * @see https://apidocs.bridge.xyz/platform/cards/sandbox/sandbox
     * @see https://docs.stripe.com/issuing/bridge-stablecoin-cards
     */
    public function issueVirtualCard(BridgeIntegration $integration, string $customerId, bool $isBusiness = false): array
    {
        $enableResult = $this->bridgeService->ensureCardsProductEnabled();
        if (! ($enableResult['success'] ?? false)
            && empty($enableResult['skipped'])
            && empty($enableResult['already_enabled'])) {
            $isProduction = (bool) ($enableResult['production'] ?? false);

            return $this->error(
                $enableResult['error'] ?? ($isProduction
                    ? 'Live Stripe Issuing is not active. Complete Bridge cards onboarding first.'
                    : 'Failed to enable Bridge cards product.'),
                'cards_enable_failed',
                400,
                [
                    'help_url' => $enableResult['help_url']
                        ?? ($isProduction
                            ? 'https://apidocs.bridge.xyz/platform/cards/overview/stripe-issuing'
                            : 'https://apidocs.bridge.xyz/platform/cards/sandbox/sandbox'),
                    'production' => $isProduction,
                ]
            );
        }

        if ($this->bridgeService->isSandbox()) {
            $forceEnable = $this->bridgeService->enableCardsProduct(null, true);
            if (! ($forceEnable['success'] ?? false) && empty($forceEnable['already_enabled'])) {
                return $this->error(
                    $forceEnable['error'] ?? 'Failed to enable Bridge cards product.',
                    'cards_enable_failed',
                    400,
                    ['help_url' => 'https://apidocs.bridge.xyz/platform/cards/sandbox/sandbox']
                );
            }
        }

        $this->clearStaleSandboxCardholderMetadata($integration, $customerId);

        $customerResult = $this->bridgeService->getCustomer($customerId);
        if (! ($customerResult['success'] ?? false) || empty($customerResult['data'])) {
            return $this->error('Failed to load Bridge customer.', 'bridge_customer_not_found', 502);
        }

        $customerData = $customerResult['data'];
        $endorsementInfo = $this->bridgeService->getCardsEndorsementInfo($customerData);

        if (! ($endorsementInfo['approved'] ?? false)) {
            $issues = $endorsementInfo['endorsement']['requirements']['issues'] ?? [];

            return $this->error(
                'Cards verification is required before issuing a card.',
                'cards_endorsement_required',
                400,
                [
                    'cards_endorsement_status' => $endorsementInfo['status'] ?? 'incomplete',
                    'cards_endorsement_issues' => $issues,
                    'requires_kyc' => true,
                ]
            );
        }

        $existing = $this->findExistingStripeCard($integration, $customerData);
        if ($existing) {
            return [
                'success' => true,
                'message' => 'Card already issued',
                'data' => $existing,
                'already_exists' => true,
            ];
        }

        $cardholderId = $this->resolveStripeCardholderId($integration, $customerId, $customerData);

        if ($cardholderId === '') {
            $readiness = $this->bridgeService->getStripeIssuingReadiness();
            $issuingEnabled = (bool) ($readiness['issuing_enabled'] ?? false);
            $stripeCardholderCount = $issuingEnabled ? $this->countStripeCardholders() : 0;

            $message = $issuingEnabled
                ? ($this->bridgeService->isSandbox()
                    ? 'Cards verification is approved but Bridge has not set stripe_cardholder_id on this customer yet. Per Bridge sandbox docs, Enable Bridge Cards must be completed before the customer is created and verified. Click Enable Bridge Cards in Settings, then reset Bridge data and complete verification again so Bridge can create the Stripe cardholder automatically.'
                    : 'Cards verification is approved but Bridge has not created a Stripe cardholder yet. Ensure live Stripe Issuing is active (Settings → Bridge Wallet → Verify Bridge Cards Setup), then complete cards endorsement verification again so Bridge can set stripe_cardholder_id on the customer.')
                : ($this->bridgeService->isSandbox()
                    ? 'Bridge has not created a Stripe cardholder yet. Install the Bridge Cards Stripe App on your Stripe Sandbox, paste those sk_test_ keys into Settings → Stripe & PayPal, then click Enable Bridge Cards before creating a new Bridge customer.'
                    : 'Bridge has not created a Stripe cardholder yet. Install the Bridge Cards Stripe App on your live Stripe account (install link from Bridge), add live Stripe keys under Settings → Stripe & PayPal, then verify setup under Settings → Bridge Wallet.');

            Log::warning('Stripe cardholder missing on Bridge customer', [
                'integration_id' => $integration->id,
                'customer_id' => $customerId,
                'stripe_account_id' => $readiness['account_id'] ?? null,
                'stripe_issuing_enabled' => $issuingEnabled,
                'stripe_cardholder_count' => $stripeCardholderCount,
                'bridge_stripe_account_id' => $customerData['stripe_account_id'] ?? null,
            ]);

            return $this->error(
                $message,
                'stripe_cardholder_missing',
                400,
                [
                    'help_url' => 'https://apidocs.bridge.xyz/platform/cards/sandbox/sandbox',
                    'stripe_account_id' => $readiness['account_id'] ?? null,
                    'stripe_issuing_enabled' => $issuingEnabled,
                    'stripe_cardholder_count' => $stripeCardholderCount,
                ]
            );
        }

        // Refresh customer data if we resolved cardholder outside the Bridge customer payload.
        if (empty($customerData['stripe_cardholder_id'])) {
            $customerData['stripe_cardholder_id'] = $cardholderId;
        }

        $walletAddress = $this->bridgeService->resolveIntegrationWalletAddress($integration);
        if (! $walletAddress) {
            return $this->error(
                'A Bridge wallet address is required to link the card. Connect your wallet first.',
                'bridge_wallet_missing',
                400
            );
        }

        if (! $this->configureStripe()) {
            return $this->error(
                'Stripe is not configured. Add keys under Settings → Stripe & PayPal.',
                'stripe_not_configured',
                400
            );
        }

        $payload = $this->buildStripeIssuingCardPayload($integration, $customerData, $cardholderId, $walletAddress, $isBusiness);
        $requestOptions = $this->buildStripeRequestOptions($customerData, $isBusiness);

        try {
            /** @var Card $card */
            $card = Cashier::stripe()->issuing->cards->create($payload, $requestOptions);
        } catch (ApiErrorException $e) {
            Log::error('Stripe Issuing card creation failed', [
                'integration_id' => $integration->id,
                'customer_id' => $customerId,
                'cardholder_id' => $cardholderId,
                'stripe_account' => $requestOptions['stripe_account'] ?? null,
                'stripe_version' => $requestOptions['stripe_version'] ?? null,
                'error' => $e->getMessage(),
            ]);

            $message = $e->getMessage();
            if (str_contains(strtolower($message), 'crypto_wallet')) {
                $message = 'Stripe rejected the Bridge wallet card parameters. Bridge must create the cardholder (stripe_cardholder_id on the Bridge customer). Your Stripe account has the Bridge Cards app, but Bridge has not synced a cardholder yet — re-link via Settings → Bridge Wallet → Enable Bridge Cards, or contact Bridge support.';
            }

            return $this->error($message, 'stripe_issuing_create_failed', 502);
        }

        $normalized = $this->normalizeStripeCard($card, $customerData);
        $this->persistIssuedCard($integration, $customerId, $card, $normalized);

        Log::info('Stripe Issuing virtual card created', [
            'integration_id' => $integration->id,
            'customer_id' => $customerId,
            'stripe_card_id' => $card->id,
            'cardholder_id' => $cardholderId,
        ]);

        return [
            'success' => true,
            'message' => 'Card issued successfully',
            'data' => $normalized,
        ];
    }

    /**
     * Resolve Stripe cardholder ID per Bridge docs: Bridge sets stripe_cardholder_id on the
     * customer when cards endorsement is approved. Poll Bridge, then search Stripe Issuing.
     *
     * @see https://apidocs.bridge.xyz/platform/cards/sandbox/sandbox
     */
    protected function resolveStripeCardholderId(
        BridgeIntegration $integration,
        string $customerId,
        array $customerData,
    ): string {
        $cardholderId = trim((string) ($customerData['stripe_cardholder_id'] ?? ''));
        if ($cardholderId !== '') {
            return $cardholderId;
        }

        $cardholderId = $this->pollBridgeCustomerForCardholderId($customerId);
        if ($cardholderId !== '') {
            return $cardholderId;
        }

        return $this->findStripeCardholderForBridgeCustomer($customerData, $customerId);
    }

    protected function pollBridgeCustomerForCardholderId(string $customerId, int $attempts = 8, int $sleepSeconds = 3): string
    {
        for ($i = 0; $i < $attempts; $i++) {
            if ($i > 0) {
                sleep($sleepSeconds);
            }

            $customerResult = $this->bridgeService->getCustomer($customerId);
            $cardholderId = trim((string) ($customerResult['data']['stripe_cardholder_id'] ?? ''));

            if ($cardholderId !== '') {
                Log::info('Bridge stripe_cardholder_id appeared after polling', [
                    'customer_id' => $customerId,
                    'attempt' => $i + 1,
                    'stripe_cardholder_id' => $cardholderId,
                ]);

                return $cardholderId;
            }
        }

        return '';
    }

    protected function findStripeCardholderForBridgeCustomer(array $customerData, string $customerId): string
    {
        if (! $this->configureStripe()) {
            return '';
        }

        $requestOptions = ['stripe_version' => $this->bridgeStripeApiVersion()];

        try {
            $cardholders = Cashier::stripe()->issuing->cardholders->all(['limit' => 100], $requestOptions);

            foreach ($cardholders->data as $cardholder) {
                $meta = (array) ($cardholder->metadata ?? []);
                if (($meta['bridge_customer_id'] ?? '') !== $customerId) {
                    continue;
                }

                if (($meta['source'] ?? '') === 'believe_wallet_sandbox_fallback') {
                    continue;
                }

                return (string) $cardholder->id;
            }
        } catch (ApiErrorException $e) {
            Log::warning('Failed to search Stripe cardholders for Bridge customer', [
                'customer_id' => $customerId,
                'error' => $e->getMessage(),
            ]);
        }

        return '';
    }

    protected function clearStaleSandboxCardholderMetadata(BridgeIntegration $integration, string $customerId): void
    {
        $metadata = is_array($integration->bridge_metadata) ? $integration->bridge_metadata : [];
        $map = is_array($metadata['sandbox_stripe_cardholders'] ?? null) ? $metadata['sandbox_stripe_cardholders'] : [];

        if ($map === []) {
            return;
        }

        unset($map[$customerId]);
        if ($map === []) {
            unset($metadata['sandbox_stripe_cardholders']);
        } else {
            $metadata['sandbox_stripe_cardholders'] = $map;
        }

        $integration->update(['bridge_metadata' => $metadata]);
    }

    protected function countStripeCardholders(): int
    {
        if (! $this->configureStripe()) {
            return 0;
        }

        try {
            $cardholders = Cashier::stripe()->issuing->cardholders->all(
                ['limit' => 100],
                ['stripe_version' => $this->bridgeStripeApiVersion()]
            );

            return count($cardholders->data);
        } catch (ApiErrorException) {
            return 0;
        }
    }

    public function findExistingStripeCard(BridgeIntegration $integration, array $customerData): ?array
    {
        $metadata = is_array($integration->bridge_metadata) ? $integration->bridge_metadata : [];
        $storedCardId = $metadata['stripe_issuing_card_id'] ?? null;

        $cardWallet = CardWallet::where('bridge_integration_id', $integration->id)
            ->where('is_primary', true)
            ->first();

        if ($cardWallet) {
            $walletMeta = is_array($cardWallet->card_metadata) ? $cardWallet->card_metadata : [];
            $storedCardId = $storedCardId ?: ($walletMeta['stripe_issuing_card_id'] ?? $cardWallet->bridge_card_account_id);
        }

        if (! $this->configureStripe()) {
            return null;
        }

        $requestOptions = $this->buildStripeRequestOptions($customerData, ($customerData['type'] ?? '') === 'business');

        if ($storedCardId) {
            try {
                $card = Cashier::stripe()->issuing->cards->retrieve($storedCardId, [], $requestOptions);

                return $this->normalizeStripeCard($card, $customerData);
            } catch (ApiErrorException $e) {
                Log::warning('Stored Stripe issuing card could not be retrieved', [
                    'integration_id' => $integration->id,
                    'stripe_card_id' => $storedCardId,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $cardholderId = trim((string) ($customerData['stripe_cardholder_id'] ?? ''));
        if ($cardholderId === '') {
            return null;
        }

        try {
            $cards = Cashier::stripe()->issuing->cards->all([
                'cardholder' => $cardholderId,
                'limit' => 1,
            ], $requestOptions);

            if (! empty($cards->data[0])) {
                return $this->normalizeStripeCard($cards->data[0], $customerData);
            }
        } catch (ApiErrorException $e) {
            Log::warning('Failed to list Stripe issuing cards for cardholder', [
                'integration_id' => $integration->id,
                'cardholder_id' => $cardholderId,
                'error' => $e->getMessage(),
            ]);
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    protected function buildStripeIssuingCardPayload(
        BridgeIntegration $integration,
        array $customerData,
        string $cardholderId,
        string $walletAddress,
        bool $isBusiness,
    ): array {
        $legacyPayload = $this->bridgeService->buildCardAccountPayload($walletAddress);
        $chain = $legacyPayload['chain'] ?? ($this->bridgeService->isSandbox() ? 'ethereum' : 'solana');
        $currency = strtolower((string) ($legacyPayload['currency'] ?? 'usdc'));

        return [
            'cardholder' => $cardholderId,
            'currency' => 'usd',
            'type' => 'virtual',
            'status' => 'active',
            'crypto_wallet' => [
                'chain' => $chain,
                'currency' => $currency,
                'type' => 'bridge_wallet',
                'address' => $walletAddress,
            ],
        ];
    }

    /**
     * Bridge stablecoin cards require a newer Stripe API version than Laravel Cashier defaults.
     *
     * @see https://docs.stripe.com/issuing/bridge-stablecoin-cards
     */
    protected function bridgeStripeApiVersion(): string
    {
        return '2025-03-31.basil';
    }

    /**
     * @return array<string, string>
     */
    protected function buildStripeRequestOptions(array $customerData, bool $isBusiness): array
    {
        $programType = $this->bridgeService->getCardsProgramType();
        $connectAccountId = trim((string) ($customerData['stripe_account_id'] ?? ''));

        $options = ['stripe_version' => $this->bridgeStripeApiVersion()];

        if (($isBusiness || $programType === 'commercial') && $connectAccountId !== '') {
            $options['stripe_account'] = $connectAccountId;
        }

        return $options;
    }

    protected function configureStripe(): bool
    {
        $stripeEnv = $this->bridgeService->isSandbox() ? 'sandbox' : 'live';

        if (StripeConfigService::configureStripe($stripeEnv)) {
            return true;
        }

        return $this->bridgeService->isSandbox()
            && StripeConfigService::configureStripe('sandbox');
    }

    /**
     * @return array<string, mixed>
     */
    protected function normalizeStripeCard(Card $card, array $customerData): array
    {
        $firstName = $customerData['first_name'] ?? '';
        $lastName = $customerData['last_name'] ?? '';
        $cardholderName = trim("{$firstName} {$lastName}");

        $lastFour = $card->last4 ?? null;
        $displayNumber = $lastFour ? "**** **** **** {$lastFour}" : null;

        return [
            'id' => $card->id,
            'stripe_card_id' => $card->id,
            'stripe_cardholder_id' => $card->cardholder ?? ($customerData['stripe_cardholder_id'] ?? null),
            'status' => $card->status ?? 'active',
            'type' => $card->type ?? 'virtual',
            'brand' => $card->brand ?? 'Visa',
            'card_number' => $displayNumber,
            'number' => $displayNumber,
            'last_four' => $lastFour,
            'pan' => $displayNumber,
            'expiry_month' => $card->exp_month ?? null,
            'expiry_year' => $card->exp_year ?? null,
            'expiration_date' => isset($card->exp_month, $card->exp_year)
                ? sprintf('%02d/%s', $card->exp_month, substr((string) $card->exp_year, -2))
                : null,
            'cardholder_name' => $cardholderName ?: null,
            'name' => $cardholderName ?: null,
            'currency' => $card->currency ?? 'usd',
            'source' => 'stripe_issuing',
        ];
    }

    protected function persistIssuedCard(
        BridgeIntegration $integration,
        string $customerId,
        Card $card,
        array $normalized,
    ): void {
        $metadata = is_array($integration->bridge_metadata) ? $integration->bridge_metadata : [];
        $metadata['stripe_issuing_card_id'] = $card->id;
        $metadata['stripe_cardholder_id'] = $card->cardholder ?? ($metadata['stripe_cardholder_id'] ?? null);
        $metadata['stripe_issuing_card_created_at'] = now()->toIso8601String();
        $integration->update(['bridge_metadata' => $metadata]);

        CardWallet::updateOrCreate(
            [
                'bridge_integration_id' => $integration->id,
                'is_primary' => true,
            ],
            [
                'bridge_customer_id' => $customerId,
                'bridge_card_account_id' => $card->id,
                'card_number' => $normalized['last_four'] ?? null,
                'card_type' => $normalized['type'] ?? 'virtual',
                'card_brand' => $normalized['brand'] ?? null,
                'expiry_month' => $normalized['expiry_month'] ?? null,
                'expiry_year' => $normalized['expiry_year'] ?? null,
                'status' => $normalized['status'] ?? 'active',
                'currency' => 'usd',
                'card_metadata' => array_merge($normalized, [
                    'stripe_issuing_card_id' => $card->id,
                ]),
            ]
        );
    }

    /**
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    protected function error(string $message, string $code, int $httpStatus, array $extra = []): array
    {
        return array_merge([
            'success' => false,
            'message' => $message,
            'error_code' => $code,
            'http_status' => $httpStatus,
        ], $extra);
    }
}
