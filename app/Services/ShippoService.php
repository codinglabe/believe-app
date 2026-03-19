<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderShippingInfo;
use App\Models\Organization;
use App\Models\Product;
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
                'Authorization' => 'ShippoToken ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ])->get($this->baseUrl . '/carrier_accounts', [
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
     * @param array $addressFrom Ship-from payload (Shippo format)
     * @param array $addressTo   Ship-to payload (Shippo format)
     * @param array $parcel      Parcel payload (Shippo format)
     * @return array{success: bool, shipment_id?: string, rates?: array, error?: string}
     */
    public function getRatesForAddresses(array $addressFrom, array $addressTo, array $parcel): array
    {
        if (! $this->isConfigured()) {
            return ['success' => false, 'error' => 'Shippo is not configured.'];
        }

        $payload = [
            'address_from' => $addressFrom,
            'address_to' => $addressTo,
            'parcels' => [$parcel],
            'async' => false,
        ];

        $response = Http::withHeaders([
            'Authorization' => 'ShippoToken ' . $this->apiKey,
            'Content-Type' => 'application/json',
        ])->post($this->baseUrl . '/shipments', $payload);

        if (! $response->successful()) {
            Log::warning('Shippo getRatesForAddresses failed', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            return [
                'success' => false,
                'error' => $response->json('message') ?? $response->body() ?? 'Failed to get shipping rates.',
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
            'Authorization' => 'ShippoToken ' . $this->apiKey,
            'Content-Type' => 'application/json',
        ])->post($this->baseUrl . '/transactions', [
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
                'error' => $response->json('message') ?? $response->body() ?? 'Failed to purchase label.',
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
     * Build address array for Shippo API.
     *
     * @param  array{name?: string, street1?: string, street2?: string, city?: string, state?: string, zip?: string, country?: string, phone?: string, email?: string}  $data
     */
    protected function addressPayload(array $data): array
    {
        $country = strtoupper($data['country'] ?? 'US');
        if (strlen($country) > 2) {
            $country = 'US';
        }

        return [
            'name' => $data['name'] ?? 'Recipient',
            'street1' => $data['street1'] ?? $data['shipping_address'] ?? $data['address'] ?? '',
            'street2' => $data['street2'] ?? '',
            'city' => $data['city'] ?? '',
            'state' => $data['state'] ?? '',
            'zip' => $data['zip'] ?? '',
            'country' => $country,
            'phone' => $data['phone'] ?? '',
            'email' => $data['email'] ?? '',
        ];
    }

    /**
     * Get ship-from address from product or organization.
     */
    protected function getShipFrom(Order $order): array
    {
        $org = $order->organization;
        $firstItem = $order->items->first();
        $product = $firstItem?->product;

        if ($product && $this->productHasShipFrom($product)) {
            return $this->addressPayload([
                'name' => $product->ship_from_name ?? $org?->name ?? 'Seller',
                'street1' => $product->ship_from_street1,
                'city' => $product->ship_from_city,
                'state' => $product->ship_from_state,
                'zip' => $product->ship_from_zip,
                'country' => $product->ship_from_country ?? 'US',
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
            ]);
        }

        return $this->addressPayload([
            'name' => 'Seller',
            'street1' => '',
            'city' => '',
            'state' => '',
            'zip' => '',
            'country' => 'US',
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

        $order->load(['shippingInfo', 'organization', 'items.product']);
        $shippingInfo = $order->shippingInfo;
        if (! $shippingInfo) {
            return ['success' => false, 'error' => 'Order has no shipping address.'];
        }

        $addressFrom = $this->getShipFrom($order);
        $addressTo = $this->addressPayload([
            'name' => trim(($shippingInfo->first_name ?? '') . ' ' . ($shippingInfo->last_name ?? '')),
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
            'Authorization' => 'ShippoToken ' . $this->apiKey,
            'Content-Type' => 'application/json',
        ])->post($this->baseUrl . '/shipments', $payload);

        if (! $response->successful()) {
            Log::warning('Shippo create shipment failed', [
                'order_id' => $order->id,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            return [
                'success' => false,
                'error' => $response->json('message') ?? $response->body() ?? 'Failed to get shipping rates.',
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
