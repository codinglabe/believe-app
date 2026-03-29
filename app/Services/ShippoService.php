<?php

namespace App\Services;

use App\Models\Order;
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
        $ratesList = array_map(function ($rate) {
            return [
                'object_id' => $rate['object_id'] ?? null,
                'provider' => $rate['provider'] ?? '',
                'servicelevel' => $rate['servicelevel'] ?? [],
                'amount' => $rate['amount'] ?? '0',
                'currency' => $rate['currency'] ?? 'USD',
                'estimated_days' => $rate['estimated_days'] ?? null,
                'duration_terms' => $rate['duration_terms'] ?? null,
            ];
        }, $rates);

        $ratesList = $this->filterActiveCarrierRates($ratesList);

        return [
            'success' => true,
            'shipment_id' => $data['object_id'] ?? null,
            'rates' => $ratesList,
        ];
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
     * Build address array for Shippo API.
     *
     * @param  array{name?: string, street1?: string, street2?: string, city?: string, state?: string, zip?: string, country?: string, phone?: string, email?: string}  $data
     */
    protected function addressPayload(array $data): array
    {
        $country = $this->normalizeCountryToIso2((string) ($data['country'] ?? 'US'));
        $zip = $this->normalizePostalCodeForShippo((string) ($data['zip'] ?? ''), $country);

        $out = [
            'name' => $data['name'] ?? 'Recipient',
            'street1' => $data['street1'] ?? $data['shipping_address'] ?? $data['address'] ?? '',
            'street2' => $data['street2'] ?? '',
            'city' => $data['city'] ?? '',
            'state' => $data['state'] ?? '',
            'zip' => $zip,
            'country' => $country,
            'phone' => $data['phone'] ?? '',
            'email' => $data['email'] ?? '',
        ];

        return $this->stripEmptyAddressFields($out);
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
            'items.organizationProduct.marketplaceProduct.merchant',
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
        $contact = $this->getSellerContactForShippo($org, $product);

        if ($product && $this->productHasShipFrom($product)) {
            return $this->addressPayload([
                'name' => $product->ship_from_name ?? $org?->name ?? 'Seller',
                'street1' => $product->ship_from_street1,
                'city' => $product->ship_from_city,
                'state' => $product->ship_from_state,
                'zip' => $product->ship_from_zip,
                'country' => $product->ship_from_country ?? 'US',
                'phone' => $contact['phone'],
                'email' => $contact['email'],
            ]);
        }

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

    protected function productHasShipFrom(Product $product): bool
    {
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
        $addressTo = $this->addressPayload([
            'name' => trim(($shippingInfo->first_name ?? '').' '.($shippingInfo->last_name ?? '')),
            'street1' => $shippingInfo->shipping_address,
            'city' => $shippingInfo->city,
            'state' => $shippingInfo->state,
            'zip' => $shippingInfo->zip,
            'country' => $shippingInfo->country ?? 'US',
            'phone' => $shippingInfo->phone,
            'email' => $shippingInfo->email,
        ]);

        $parcel = $this->getParcel($order);

        $payload = [
            'address_from' => $addressFrom,
            'address_to' => $addressTo,
            'parcels' => [$parcel],
            'async' => false,
        ];

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
        $ratesList = array_map(function ($rate) {
            return [
                'object_id' => $rate['object_id'] ?? null,
                'provider' => $rate['provider'] ?? '',
                'servicelevel' => $rate['servicelevel'] ?? [],
                'amount' => $rate['amount'] ?? '0',
                'currency' => $rate['currency'] ?? 'USD',
                'estimated_days' => $rate['estimated_days'] ?? null,
                'duration_terms' => $rate['duration_terms'] ?? null,
            ];
        }, $rates);

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
