<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderShippingInfo;
use App\Models\Organization;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ShippoService
{
    protected string $baseUrl;

    protected ?string $apiKey;

    /**
     * Cached "carrier token" set of accounts that are active + connected.
     * Key format: lowercase provider token (e.g. dhl_express)
     */
    protected ?array $activeCarrierTokensCache = null;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.shippo.api_base', 'https://api.goshippo.com'), '/');
        $this->apiKey = config('services.shippo.api_key');
    }

    public function isConfigured(): bool
    {
        return ! empty($this->apiKey);
    }

    /**
     * Shippo ShipmentExtra: bypass strict USPS/CASS validation when the address is correct but fails "Address not found".
     *
     * @return array<string, mixed>
     */
    protected function shipmentExtraForValidationBypass(): array
    {
        if (! filter_var(config('services.shippo.bypass_address_validation', true), FILTER_VALIDATE_BOOLEAN)) {
            return [];
        }

        return ['bypass_address_validation' => true];
    }

    /**
     * Trim and normalize whitespace for Shippo address fields.
     */
    protected function sanitizeAddressComponent(?string $value): string
    {
        $s = trim((string) $value);
        if ($s === '') {
            return '';
        }
        $s = preg_replace('/\s+/u', ' ', $s) ?? $s;

        return $s;
    }

    /**
     * USPS and many carriers require ship-from email + phone.
     * Prefer organization profile, then the org's linked User (seller account), then product owner User.
     * Finally applies config fallbacks (MAIL_FROM_ADDRESS / SHIPPO_FALLBACK_*) so labels are not blocked.
     *
     * @return array{email: string, phone: string}
     */
    public function getSellerContactForShippo(?Organization $org, ?Product $product = null): array
    {
        if (! $org && $product) {
            $product->loadMissing('organization.user');
            $org = $product->organization;
        }

        $email = '';
        $phone = '';

        if ($org) {
            $org->loadMissing('user');
            $email = trim((string) ($org->email ?? ''));
            if ($email === '') {
                $email = trim((string) ($org->platform_email ?? ''));
            }
            $phone = trim((string) ($org->phone ?? ''));

            $sellerUser = $org->user;
            if ($email === '' && $sellerUser instanceof User) {
                $email = trim((string) ($sellerUser->email ?? ''));
            }
            if ($phone === '' && $sellerUser instanceof User) {
                $phone = trim((string) ($sellerUser->contact_number ?? ''));
            }
        }

        if (($email === '' || $phone === '') && $product) {
            $product->loadMissing('user');
            $owner = $product->user;
            if ($owner instanceof User) {
                if ($email === '') {
                    $email = trim((string) ($owner->email ?? ''));
                }
                if ($phone === '') {
                    $phone = trim((string) ($owner->contact_number ?? ''));
                }
            }
        }

        $fallbackEmail = trim((string) config('services.shippo.fallback_seller_email', ''));
        $fallbackPhone = trim((string) config('services.shippo.fallback_seller_phone', ''));

        if ($email === '' && $fallbackEmail !== '') {
            $email = $fallbackEmail;
        }
        if ($phone === '' && $fallbackPhone !== '') {
            $phone = $fallbackPhone;
        }

        // config('services.shippo.*') can be empty if env omitted; always try Laravel mail "from" next.
        if ($email === '') {
            $email = trim((string) config('mail.from.address', ''));
        }

        return $this->finalizeSellerContactForUsps($email, $phone, $org?->id, $product?->id);
    }

    /**
     * USPS requires both non-empty email and phone on ship-from. Never return blanks.
     *
     * @return array{email: string, phone: string}
     */
    protected function finalizeSellerContactForUsps(string $email, string $phone, ?int $organizationId, ?int $productId): array
    {
        $email = trim($email);
        $phone = trim($phone);

        if ($email === '') {
            $domain = trim((string) config('app.platform_email_domain', 'example.com'));
            $domain = $domain !== '' ? ltrim($domain, '@') : 'example.com';
            $email = 'noreply@'.$domain;
            Log::info('Shippo: using noreply@ platform domain for seller email (seller had no email)', [
                'organization_id' => $organizationId,
                'product_id' => $productId,
            ]);
        }

        if ($phone === '') {
            $phone = trim((string) config('services.shippo.fallback_seller_phone', ''));
        }

        if ($phone === '') {
            $phone = '5555555555';
            Log::warning('Shippo: using default seller phone placeholder — set SHIPPO_FALLBACK_SELLER_PHONE in .env for production', [
                'organization_id' => $organizationId,
                'product_id' => $productId,
            ]);
        }

        $phone = $this->normalizePhoneForShippo($phone);

        return ['email' => $email, 'phone' => $phone];
    }

    /**
     * Prefer E.164 for US 10-digit numbers (Shippo/USPS are less flaky).
     */
    protected function normalizePhoneForShippo(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone);
        if (strlen($digits) === 10) {
            return '+1'.$digits;
        }
        if (strlen($digits) === 11 && str_starts_with($digits, '1')) {
            return '+'.$digits;
        }

        return $phone;
    }

    /**
     * Ship-to phone is required by many carriers (e.g. USPS). Use profile phone or config fallback.
     */
    public function ensureRecipientPhoneForShippo(?string $phone): string
    {
        $p = trim((string) $phone);
        if ($p !== '') {
            return $this->normalizePhoneForShippo($p);
        }
        $fallback = trim((string) config('services.shippo.fallback_seller_phone', ''));
        if ($fallback !== '') {
            return $this->normalizePhoneForShippo($fallback);
        }

        return '+15555555555';
    }

    /**
     * Human-readable text from Shippo shipment `messages` (validation / no-rates reasons).
     *
     * @param  array<int, mixed>  $messages
     */
    protected function formatShippoShipmentMessages(array $messages): string
    {
        $parts = [];
        foreach ($messages as $m) {
            if (is_string($m) && trim($m) !== '') {
                $parts[] = trim($m);

                continue;
            }
            if (! is_array($m)) {
                continue;
            }
            $t = $m['text'] ?? $m['message'] ?? null;
            if (is_string($t) && trim($t) !== '') {
                $parts[] = trim($t);
            }
        }
        $parts = array_values(array_unique($parts));

        return $parts !== [] ? implode(' ', $parts) : '';
    }

    /**
     * Return a set of carrier tokens whose carrier account is active AND connected.
     *
     * This avoids label purchase failures when a specific carrier (e.g. DHL Express)
     * has not completed registration/terms activation.
     *
     * @return array<string, true>
     */
    public function getActiveCarrierTokens(): array
    {
        if ($this->activeCarrierTokensCache !== null) {
            return $this->activeCarrierTokensCache;
        }

        $this->activeCarrierTokensCache = [];
        if (! $this->isConfigured()) {
            return $this->activeCarrierTokensCache;
        }

        $page = 1;
        $resultsPerPage = 100;
        $maxPages = 5; // safety
        $hasNext = true;

        do {
            $response = Http::withHeaders([
                'Authorization' => 'ShippoToken '.$this->apiKey,
                'Content-Type' => 'application/json',
            ])->get($this->baseUrl.'/carrier_accounts', [
                'results' => $resultsPerPage,
                'page' => $page,
            ]);

            if (! $response->successful()) {
                Log::warning('Shippo getActiveCarrierTokens failed', [
                    'status' => $response->status(),
                    'body' => $response->json(),
                ]);
                break;
            }

            $data = $response->json();
            $items = $data['results'] ?? [];

            foreach ($items as $acc) {
                $carrierToken = strtolower(trim((string) ($acc['carrier'] ?? '')));
                if (! $carrierToken) {
                    continue;
                }

                $active = (bool) ($acc['active'] ?? false);
                $authStatus = $acc['object_info']['authentication']['status'] ?? null;

                // Shippo docs: authentication.status can be 'connected', 'disconnected', 'authorization_pending'
                if ($active && $authStatus === 'connected') {
                    $this->activeCarrierTokensCache[$carrierToken] = true;
                }
            }

            $page++;
            $next = $data['next'] ?? null;
            $hasNext = is_string($next) && $next !== '';
        } while ($hasNext && $page <= $maxPages);

        return $this->activeCarrierTokensCache;
    }

    /**
     * Filter out rates whose provider carrier account is not active/connected in Shippo.
     */
    protected function filterActiveCarrierRates(array $rates): array
    {
        $activeTokens = $this->getActiveCarrierTokens();
        if (empty($activeTokens)) {
            return $rates; // if we can't determine, don't block shipping
        }

        $filtered = array_values(array_filter($rates, function ($rate) use ($activeTokens) {
            $provider = strtolower(trim((string) ($rate['provider'] ?? '')));
            if (! $provider) {
                // unknown provider token, keep (better than returning empty rates)
                return true;
            }

            return isset($activeTokens[$provider]);
        }));

        return ! empty($filtered) ? $filtered : $rates; // fallback if filtering removes everything
    }

    /**
     * Shippo: Create shipment rates from explicit payloads.
     *
     * @param  array  $addressFrom  Ship-from payload (Shippo format)
     * @param  array  $addressTo  Ship-to payload (Shippo format)
     * @param  array  $parcel  Parcel payload (Shippo format)
     * @return array{success: bool, shipment_id?: string, rates?: array, error?: string}
     */
    public function getRatesForAddresses(array $addressFrom, array $addressTo, array $parcel): array
    {
        if (! $this->isConfigured()) {
            return ['success' => false, 'error' => 'Shippo is not configured.'];
        }

        $payload = [
            'address_from' => $this->addressPayload($addressFrom),
            'address_to' => $this->addressPayload($addressTo),
            'parcels' => [$parcel],
            'async' => false,
        ];

        $extra = $this->shipmentExtraForValidationBypass();
        if ($extra !== []) {
            $payload['extra'] = $extra;
        }

        $response = Http::withHeaders([
            'Authorization' => 'ShippoToken '.$this->apiKey,
            'Content-Type' => 'application/json',
        ])->post($this->baseUrl.'/shipments', $payload);

        if (! $response->successful()) {
            Log::warning('Shippo getRatesForAddresses failed', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            return [
                'success' => false,
                'error' => $this->shippoApiErrorMessage($response),
            ];
        }

        $data = $response->json();
        $rates = $data['rates'] ?? [];
        $messages = is_array($data['messages'] ?? null) ? $data['messages'] : [];

        if ($rates === []) {
            $fromMessages = $this->formatShippoShipmentMessages($messages);
            $detail = $fromMessages !== ''
                ? $fromMessages
                : 'Shippo returned no rates for this shipment (check ship-from, ship-to, and parcel).';

            Log::warning('Shippo getRatesForAddresses: empty rates', [
                'messages' => $messages,
                'shipment_status' => $data['status'] ?? null,
            ]);

            return [
                'success' => false,
                'error' => $detail,
            ];
        }

        $ratesList = $this->mapRawShippoRates($rates);

        $ratesList = $this->filterActiveCarrierRates($ratesList);

        return [
            'success' => true,
            'shipment_id' => $data['object_id'] ?? null,
            'rates' => $ratesList,
        ];
    }

    /**
     * Re-fetch rates for an existing shipment (same rate object_ids as when the shipment was created).
     *
     * @return array{success: bool, shipment_id?: string, rates?: array, error?: string}
     */
    public function retrieveShipmentRates(string $shipmentObjectId): array
    {
        if (! $this->isConfigured()) {
            return ['success' => false, 'error' => 'Shippo is not configured.'];
        }

        $shipmentObjectId = trim($shipmentObjectId);
        if ($shipmentObjectId === '') {
            return ['success' => false, 'error' => 'Missing Shippo shipment id.'];
        }

        $response = Http::withHeaders([
            'Authorization' => 'ShippoToken '.$this->apiKey,
        ])->get($this->baseUrl.'/shipments/'.$shipmentObjectId);

        if (! $response->successful()) {
            Log::warning('Shippo retrieveShipmentRates failed', [
                'status' => $response->status(),
                'shipment_id' => $shipmentObjectId,
                'body' => $response->json(),
            ]);

            return [
                'success' => false,
                'error' => $this->shippoApiErrorMessage($response),
            ];
        }

        $data = $response->json();
        $rates = $data['rates'] ?? [];
        $messages = is_array($data['messages'] ?? null) ? $data['messages'] : [];

        if ($rates === []) {
            $fromMessages = $this->formatShippoShipmentMessages($messages);
            $detail = $fromMessages !== ''
                ? $fromMessages
                : 'This Shippo shipment no longer has rates. Refresh shipping options.';

            return [
                'success' => false,
                'error' => $detail,
            ];
        }

        $ratesList = $this->mapRawShippoRates($rates);
        $ratesList = $this->filterActiveCarrierRates($ratesList);

        return [
            'success' => true,
            'shipment_id' => $data['object_id'] ?? $shipmentObjectId,
            'rates' => $ratesList,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $rates
     * @return array<int, array<string, mixed>>
     */
    protected function mapRawShippoRates(array $rates): array
    {
        return array_values(array_map(function ($rate) {
            return [
                'object_id' => $rate['object_id'] ?? null,
                'provider' => $rate['provider'] ?? '',
                'servicelevel' => $rate['servicelevel'] ?? [],
                'amount' => $rate['amount'] ?? '0',
                'currency' => $rate['currency'] ?? 'USD',
                'estimated_days' => $rate['estimated_days'] ?? null,
                'duration_terms' => $rate['duration_terms'] ?? null,
            ];
        }, $rates));
    }

    /**
     * Normalize Shippo rate rows for checkout UI. Each method id is the rate object_id used to purchase a label.
     *
     * @param  array<int, array<string, mixed>>  $rates  Rows from getRatesForAddresses()['rates']
     * @return array<int, array{id: string, name: string, cost: float, estimated_days: string, provider: string, currency: string}>
     */
    public function ratesToCheckoutMethods(array $rates): array
    {
        $methods = [];
        foreach ($rates as $rate) {
            $objectId = $rate['object_id'] ?? null;
            if (! $objectId) {
                continue;
            }
            $provider = trim((string) ($rate['provider'] ?? '')) ?: 'Carrier';
            $svc = $rate['servicelevel'] ?? [];
            $svcLabel = '';
            if (is_array($svc)) {
                $svcLabel = trim((string) ($svc['name'] ?? $svc['token'] ?? ''));
            } elseif (is_string($svc)) {
                $svcLabel = trim($svc);
            }
            $name = trim($provider.($svcLabel !== '' ? ' — '.$svcLabel : ''));
            if ($name === '') {
                $name = 'Shipping';
            }
            $est = $rate['estimated_days'] ?? null;
            $methods[] = [
                'id' => (string) $objectId,
                'name' => $name,
                'cost' => round((float) ($rate['amount'] ?? 0), 2),
                'estimated_days' => $est !== null && $est !== '' ? (string) $est : '—',
                'provider' => $provider,
                'currency' => (string) ($rate['currency'] ?? 'USD'),
            ];
        }
        usort($methods, fn ($a, $b) => $a['cost'] <=> $b['cost']);

        return $methods;
    }

    /**
     * Shippo: Purchase label by rate object id.
     *
     * @return array{success: bool, transaction_id?: string, tracking_number?: string, tracking_url?: string, label_url?: string, carrier?: string, error?: string}
     */
    public function purchaseLabel(string $rateObjectId, string $labelFormat = 'PDF'): array
    {
        if (! $this->isConfigured()) {
            return ['success' => false, 'error' => 'Shippo is not configured.'];
        }

        $response = Http::withHeaders([
            'Authorization' => 'ShippoToken '.$this->apiKey,
            'Content-Type' => 'application/json',
        ])->post($this->baseUrl.'/transactions', [
            'rate' => $rateObjectId,
            'label_file_type' => $labelFormat,
            'async' => false,
        ]);

        if (! $response->successful()) {
            Log::warning('Shippo purchaseLabel failed', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            return [
                'success' => false,
                'error' => $this->shippoApiErrorMessage($response),
            ];
        }

        $data = $response->json();
        $shippoStatus = $data['status'] ?? null;
        if ($shippoStatus && $shippoStatus !== 'SUCCESS') {
            // Shippo can return HTTP 200 but still set Transaction status = ERROR.
            $messages = $data['messages'] ?? [];
            $text = null;
            if (is_array($messages)) {
                $text = $messages[0]['text'] ?? null;
                $code = $messages[0]['code'] ?? null;
            } else {
                $text = $messages['text'] ?? null;
                $code = $messages['code'] ?? null;
            }

            Log::warning('Shippo purchaseLabel returned non-success status', [
                'shippo_status' => $shippoStatus,
                'rate_object_id' => $rateObjectId,
                'message' => $text,
                'code' => $code ?? null,
            ]);

            return [
                'success' => false,
                'error' => $text ?? 'Failed to purchase label.',
                'shippo_status' => $shippoStatus,
            ];
        }

        $trackingNumber = $data['tracking_number'] ?? null;
        $trackingUrl = $data['tracking_url_provider'] ?? $data['tracking_url'] ?? null;
        $labelUrl = $data['label_url'] ?? null;
        $carrier = $data['rate']['provider'] ?? $data['carrier'] ?? null;

        return [
            'success' => true,
            'transaction_id' => $data['object_id'] ?? null,
            'tracking_number' => $trackingNumber,
            'tracking_url' => $trackingUrl,
            'label_url' => $labelUrl,
            'carrier' => $carrier,
        ];
    }

    /**
     * Shippo → carrier APIs (e.g. USPS) reject empty XML elements: '' fails patterns like PhoneNumber.
     * Omit keys rather than sending blank strings.
     *
     * @param  array<string, mixed>  $address
     * @return array<string, mixed>
     */
    public function stripEmptyAddressFields(array $address): array
    {
        foreach ($address as $key => $value) {
            if (is_string($value) && trim($value) === '') {
                unset($address[$key]);
            }
        }

        return $address;
    }

    /**
     * Best-effort parse of Shippo error JSON (message, __all__, nested field errors).
     */
    protected function shippoApiErrorMessage(\Illuminate\Http\Client\Response $response): string
    {
        $json = $response->json();
        if (! is_array($json)) {
            $body = trim((string) $response->body());

            return $body !== '' ? $body : 'Request failed.';
        }
        if (! empty($json['message']) && is_string($json['message'])) {
            return $json['message'];
        }
        if (isset($json['__all__']) && is_array($json['__all__']) && isset($json['__all__'][0])) {
            return (string) $json['__all__'][0];
        }
        foreach ($json as $v) {
            if (is_array($v) && isset($v[0]) && is_string($v[0])) {
                return $v[0];
            }
        }
        if (! empty($json['messages']) && is_string($json['messages'])) {
            return $json['messages'];
        }

        return 'Request failed.';
    }

    /**
     * Map common country names / variants to ISO 3166-1 alpha-2 for Shippo.
     * Previously any non-2-letter value was forced to US, which broke UK/CA/AU postcodes ("Postcode not found").
     */
    public function normalizeCountryToIso2(string $country): string
    {
        $c = trim(strtoupper($country));
        if ($c === '') {
            return 'US';
        }

        $aliases = [
            'USA' => 'US', 'U.S.A.' => 'US', 'U.S.A' => 'US', 'UNITED STATES' => 'US', 'UNITED STATES OF AMERICA' => 'US',
            'UK' => 'GB', 'UNITED KINGDOM' => 'GB', 'GREAT BRITAIN' => 'GB', 'ENGLAND' => 'GB', 'SCOTLAND' => 'GB', 'WALES' => 'GB',
            'CANADA' => 'CA',
            'AUSTRALIA' => 'AU',
            'IRELAND' => 'IE', 'REPUBLIC OF IRELAND' => 'IE',
        ];

        if (isset($aliases[$c])) {
            return $aliases[$c];
        }

        if (strlen($c) === 2 && ctype_alpha($c)) {
            return $c;
        }

        return 'US';
    }

    /**
     * Normalize postal codes so Shippo address validation can match (US ZIP, UK postcodes, CA postal codes).
     */
    protected function normalizePostalCodeForShippo(string $zip, string $countryIso2): string
    {
        $zip = trim($zip);
        if ($zip === '') {
            return '';
        }

        if ($countryIso2 === 'US') {
            $digits = preg_replace('/\D/', '', $zip) ?? '';
            if (strlen($digits) >= 9) {
                return substr($digits, 0, 5).'-'.substr($digits, 5, 4);
            }
            if (strlen($digits) >= 5) {
                return substr($digits, 0, 5);
            }

            return $zip;
        }

        if ($countryIso2 === 'GB') {
            $clean = preg_replace('/\s+/', '', strtoupper($zip)) ?? '';
            if (strlen($clean) >= 5 && strlen($clean) <= 12) {
                $inward = substr($clean, -3);
                $outward = substr($clean, 0, -3);

                return $outward.' '.$inward;
            }

            return strtoupper($zip);
        }

        if ($countryIso2 === 'CA') {
            $clean = preg_replace('/\s+/', '', strtoupper($zip)) ?? '';
            if (strlen($clean) === 6 && ctype_alnum($clean)) {
                return substr($clean, 0, 3).' '.substr($clean, 3, 3);
            }

            return strtoupper($zip);
        }

        return $zip;
    }

    /**
     * Shippo/USPS validation expects a 2-letter US state code when country is US.
     */
    protected function normalizeUsStateForShippo(string $state): string
    {
        $s = trim($state);
        if ($s === '') {
            return '';
        }
        if (strlen($s) === 2) {
            return strtoupper($s);
        }

        static $map = [
            'alabama' => 'AL', 'alaska' => 'AK', 'arizona' => 'AZ', 'arkansas' => 'AR', 'california' => 'CA',
            'colorado' => 'CO', 'connecticut' => 'CT', 'delaware' => 'DE', 'florida' => 'FL', 'georgia' => 'GA',
            'hawaii' => 'HI', 'idaho' => 'ID', 'illinois' => 'IL', 'indiana' => 'IN', 'iowa' => 'IA',
            'kansas' => 'KS', 'kentucky' => 'KY', 'louisiana' => 'LA', 'maine' => 'ME', 'maryland' => 'MD',
            'massachusetts' => 'MA', 'michigan' => 'MI', 'minnesota' => 'MN', 'mississippi' => 'MS', 'missouri' => 'MO',
            'montana' => 'MT', 'nebraska' => 'NE', 'nevada' => 'NV', 'new hampshire' => 'NH', 'new jersey' => 'NJ',
            'new mexico' => 'NM', 'new york' => 'NY', 'north carolina' => 'NC', 'north dakota' => 'ND', 'ohio' => 'OH',
            'oklahoma' => 'OK', 'oregon' => 'OR', 'pennsylvania' => 'PA', 'rhode island' => 'RI', 'south carolina' => 'SC',
            'south dakota' => 'SD', 'tennessee' => 'TN', 'texas' => 'TX', 'utah' => 'UT', 'vermont' => 'VT',
            'virginia' => 'VA', 'washington' => 'WA', 'west virginia' => 'WV', 'wisconsin' => 'WI', 'wyoming' => 'WY',
            'district of columbia' => 'DC', 'american samoa' => 'AS', 'guam' => 'GU', 'northern mariana islands' => 'MP',
            'puerto rico' => 'PR', 'us virgin islands' => 'VI', 'u.s. virgin islands' => 'VI',
        ];

        $key = strtolower($s);

        return $map[$key] ?? $s;
    }

    /**
     * Build address array for Shippo API.
     *
     * @param  array{name?: string, street1?: string, street2?: string, city?: string, state?: string, zip?: string, country?: string, phone?: string, email?: string}  $data
     */
    protected function addressPayload(array $data): array
    {
        $country = $this->normalizeCountryToIso2((string) ($data['country'] ?? 'US'));
        $zip = $this->normalizePostalCodeForShippo((string) ($data['zip'] ?? ''), $country);

        $state = trim((string) ($data['state'] ?? ''));
        if ($country === 'US' && $state !== '') {
            $state = $this->normalizeUsStateForShippo($state);
        }

        $name = $this->sanitizeAddressComponent($data['name'] ?? '');
        $street1 = $this->sanitizeAddressComponent($data['street1'] ?? $data['shipping_address'] ?? $data['address'] ?? '');
        $street2 = $this->sanitizeAddressComponent($data['street2'] ?? '');
        $city = $this->sanitizeAddressComponent($data['city'] ?? '');

        $out = [
            'name' => $name !== '' ? $name : 'Recipient',
            'street1' => $street1,
            'street2' => $street2,
            'city' => $city,
            'state' => $state,
            'zip' => $zip,
            'country' => $country,
            'phone' => $this->sanitizeAddressComponent($data['phone'] ?? ''),
            'email' => trim((string) ($data['email'] ?? '')),
        ];

        return $this->stripEmptyAddressFields($out);
    }

    /**
     * Ship-from for manual products: linked merchant warehouse, saved custom address, or organization fallback.
     *
     * @return array<string, mixed>
     */
    public function shipFromForManualProduct(Product $product, ?\App\Models\Organization $org): array
    {
        $product->loadMissing(['shipFromMerchant.shippingAddresses', 'user']);
        $sellerContact = $this->getSellerContactForShippo($org, $product);

        if ($product->ship_from_merchant_id && $product->shipFromMerchant) {
            $m = $product->shipFromMerchant;
            $parts = $m->shipFromAddressForRates();
            $mEmail = trim((string) ($m->email ?? ''));
            $mPhone = trim((string) ($m->phone ?? ''));
            if ($mEmail !== '') {
                $sellerContact['email'] = $mEmail;
            }
            if ($mPhone !== '') {
                $sellerContact['phone'] = $mPhone;
            }

            return $this->addressPayload([
                'name' => $parts['name'],
                'street1' => $parts['street1'],
                'street2' => $parts['street2'] ?? '',
                'city' => $parts['city'],
                'state' => $parts['state'],
                'zip' => $parts['zip'],
                'country' => $parts['country'] ?? 'US',
                'phone' => $sellerContact['phone'],
                'email' => $sellerContact['email'],
            ]);
        }

        return $this->addressPayload([
            'name' => $product->ship_from_name ?: ($org?->contact_name ?: ($org?->name ?? 'Seller')),
            'street1' => $product->ship_from_street1 ?: ($org?->street ?? ''),
            'street2' => '',
            'city' => $product->ship_from_city ?: ($org?->city ?? ''),
            'state' => $product->ship_from_state ?: ($org?->state ?? ''),
            'zip' => $product->ship_from_zip ?: ($org?->zip ?? ''),
            'country' => $product->ship_from_country ?: 'US',
            'phone' => $sellerContact['phone'],
            'email' => $sellerContact['email'],
        ]);
    }

    /**
     * Get ship-from address from product or organization.
     */
    protected function getShipFrom(Order $order): array
    {
        $order->loadMissing([
            'organization.user',
            'items.product.organization.user',
            'items.product.user',
            'items.product.shipFromMerchant.shippingAddresses',
            'items.organizationProduct.marketplaceProduct.merchant.shippingAddresses',
        ]);
        $firstItem = $order->items->first();

        if ($firstItem?->organization_product_id) {
            $merchant = $firstItem->organizationProduct?->marketplaceProduct?->merchant;
            if ($merchant) {
                $parts = $merchant->shipFromAddressForRates();
                $contact = $this->getSellerContactForShippo(null, null);
                $mEmail = trim((string) ($merchant->email ?? ''));
                $mPhone = trim((string) ($merchant->phone ?? ''));
                if ($mEmail !== '') {
                    $contact['email'] = $mEmail;
                }
                if ($mPhone !== '') {
                    $contact['phone'] = $mPhone;
                }

                return $this->addressPayload([
                    'name' => $parts['name'],
                    'street1' => $parts['street1'],
                    'street2' => $parts['street2'] ?? '',
                    'city' => $parts['city'],
                    'state' => $parts['state'],
                    'zip' => $parts['zip'],
                    'country' => $parts['country'],
                    'phone' => $contact['phone'],
                    'email' => $contact['email'],
                ]);
            }
        }

        $product = $firstItem?->product;
        // Order may not have organization loaded; product always belongs to an org for marketplace items.
        $org = $order->organization ?? $product?->organization;

        if ($product && $this->productHasShipFrom($product)) {
            return $this->shipFromForManualProduct($product, $org);
        }

        $contact = $this->getSellerContactForShippo($org, $product);

        if ($org) {
            return $this->addressPayload([
                'name' => $org->contact_name ?: $org->name,
                'street1' => $org->street,
                'city' => $org->city,
                'state' => $org->state,
                'zip' => $org->zip,
                'country' => 'US',
                'phone' => $contact['phone'],
                'email' => $contact['email'],
            ]);
        }

        return $this->addressPayload([
            'name' => 'Seller',
            'street1' => '',
            'city' => '',
            'state' => '',
            'zip' => '',
            'country' => 'US',
            'phone' => $contact['phone'],
            'email' => $contact['email'],
        ]);
    }

    public function productHasShipFrom(Product $product): bool
    {
        $product->loadMissing('shipFromMerchant.shippingAddresses');

        if ($product->ship_from_merchant_id) {
            $m = $product->shipFromMerchant;
            if (! $m) {
                return false;
            }
            $p = $m->shipFromAddressForRates();

            return trim((string) $p['street1']) !== ''
                && trim((string) $p['city']) !== ''
                && trim((string) $p['zip']) !== '';
        }

        return ! empty($product->ship_from_street1) && ! empty($product->ship_from_city) && ! empty($product->ship_from_zip);
    }

    /**
     * Get parcel dimensions from product or defaults.
     */
    protected function getParcel(Order $order): array
    {
        $firstItem = $order->items->first();
        $product = $firstItem?->product;

        $length = 10.0;
        $width = 8.0;
        $height = 4.0;
        $weight = 16.0; // 1 lb in oz

        if ($product && $this->productHasParcel($product)) {
            $length = (float) $product->parcel_length_in;
            $width = (float) $product->parcel_width_in;
            $height = (float) $product->parcel_height_in;
            $weight = (float) $product->parcel_weight_oz;
        }

        if ($weight < 0.1) {
            $weight = 16.0;
        }

        return [
            'length' => (string) $length,
            'width' => (string) $width,
            'height' => (string) $height,
            'distance_unit' => 'in',
            'weight' => (string) $weight,
            'mass_unit' => 'oz',
        ];
    }

    /**
     * Public wrapper so other controllers can snapshot parcel dimensions/weight.
     */
    public function getParcelSnapshot(Order $order): array
    {
        return $this->getParcel($order);
    }

    protected function productHasParcel(Product $product): bool
    {
        return $product->parcel_length_in !== null && $product->parcel_width_in !== null
            && $product->parcel_height_in !== null && $product->parcel_weight_oz !== null;
    }

    /**
     * Street lines as stored for the order (matches bid/checkout: line1 + optional line2).
     * Legacy rows may only have a single shipping_address with "line1, line2" concatenated — split for Shippo.
     *
     * @return array{street1: string, street2: string}
     */
    public function splitOrderShippingStreetLines(OrderShippingInfo $info): array
    {
        $line1 = trim((string) ($info->shipping_address ?? ''));
        $line2 = trim((string) ($info->shipping_address_line2 ?? ''));

        if ($line2 === '' && $line1 !== '' && str_contains($line1, ', ')) {
            $parts = explode(', ', $line1, 2);
            if (count($parts) === 2 && strlen(trim($parts[0])) >= 3 && strlen(trim($parts[1])) <= 120) {
                return ['street1' => trim($parts[0]), 'street2' => trim($parts[1])];
            }
        }

        return ['street1' => $line1, 'street2' => $line2];
    }

    /**
     * Ship-to payload for Shippo (same structure as winning-bid checkout rates).
     */
    public function shipToAddressFromOrderShipping(OrderShippingInfo $info): array
    {
        $lines = $this->splitOrderShippingStreetLines($info);

        return $this->addressPayload([
            'name' => trim(($info->first_name ?? '').' '.($info->last_name ?? '')),
            'street1' => $lines['street1'],
            'street2' => $lines['street2'],
            'city' => $info->city,
            'state' => $info->state,
            'zip' => $info->zip,
            'country' => $info->country ?? 'US',
            'phone' => $this->ensureRecipientPhoneForShippo($info->phone),
            'email' => $info->email,
        ]);
    }

    /**
     * Create a shipment and return available rates.
     *
     * @return array{success: bool, shipment_id?: string, rates?: array, error?: string}
     */
    public function createShipment(Order $order): array
    {
        if (! $this->isConfigured()) {
            return ['success' => false, 'error' => 'Shippo is not configured.'];
        }

        $order->load(['shippingInfo', 'organization.user', 'items.product.organization.user', 'items.product.user']);
        $shippingInfo = $order->shippingInfo;
        if (! $shippingInfo) {
            return ['success' => false, 'error' => 'Order has no shipping address.'];
        }

        $addressFrom = $this->getShipFrom($order);
        if (trim((string) ($addressFrom['street1'] ?? '')) === '') {
            return [
                'success' => false,
                'error' => 'Ship-from address is incomplete. Set the product ship-from address or your organization warehouse address.',
            ];
        }

        $addressTo = $this->shipToAddressFromOrderShipping($shippingInfo);

        $parcel = $this->getParcel($order);

        // Always create a fresh shipment from current order shipping + product ship-from so Shippo
        // matches what the buyer entered and what the product uses (no stale cached shipment).

        $payload = [
            'address_from' => $addressFrom,
            'address_to' => $addressTo,
            'parcels' => [$parcel],
            'async' => false,
        ];

        $extra = $this->shipmentExtraForValidationBypass();
        if ($extra !== []) {
            $payload['extra'] = $extra;
        }

        $response = Http::withHeaders([
            'Authorization' => 'ShippoToken '.$this->apiKey,
            'Content-Type' => 'application/json',
        ])->post($this->baseUrl.'/shipments', $payload);

        if (! $response->successful()) {
            Log::warning('Shippo create shipment failed', [
                'order_id' => $order->id,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            return [
                'success' => false,
                'error' => $this->shippoApiErrorMessage($response),
            ];
        }

        $data = $response->json();
        $rates = $data['rates'] ?? [];
        $messages = is_array($data['messages'] ?? null) ? $data['messages'] : [];

        if ($rates === []) {
            $fromMessages = $this->formatShippoShipmentMessages($messages);
            $detail = $fromMessages !== ''
                ? $fromMessages
                : 'Shippo returned no rates for this shipment (check ship-from, ship-to, and parcel).';

            Log::warning('Shippo createShipment: empty rates', [
                'order_id' => $order->id,
                'messages' => $messages,
                'shipment_status' => $data['status'] ?? null,
            ]);

            return [
                'success' => false,
                'error' => $detail,
            ];
        }

        $ratesList = $this->mapRawShippoRates($rates);
        $ratesList = $this->filterActiveCarrierRates($ratesList);

        return [
            'success' => true,
            'shipment_id' => $data['object_id'] ?? null,
            'rates' => $ratesList,
        ];
    }

    /**
     * Purchase a label for the given rate.
     *
     * @return array{success: bool, tracking_number?: string, tracking_url?: string, label_url?: string, carrier?: string, error?: string}
     */
    public function createTransaction(Order $order, string $rateObjectId, string $labelFormat = 'PDF'): array
    {
        // Backward-compatible wrapper for older callers (OrderController)
        return $this->purchaseLabel($rateObjectId, $labelFormat);
    }
}
