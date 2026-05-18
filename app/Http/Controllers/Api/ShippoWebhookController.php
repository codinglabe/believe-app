<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ShippoWebhookTrackingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ShippoWebhookController extends Controller
{
    public function __construct(
        protected ShippoWebhookTrackingService $trackingService
    ) {}

    /**
     * Verify optional Shippo webhook security (see https://docs.goshippo.com/docs/tracking/webhooksecurity/).
     * When SHIPPO_WEBHOOK_TOKEN and/or SHIPPO_WEBHOOK_HMAC_SECRET are set, requests must pass the checks.
     */
    private function verifyWebhookRequest(Request $request, string $rawBody): ?JsonResponse
    {
        $queryToken = trim((string) config('services.shippo.webhook_query_token', ''));
        if ($queryToken !== '') {
            $given = (string) $request->query('token', '');
            if (! hash_equals($queryToken, $given)) {
                return response()->json(['ok' => false, 'error' => 'Unauthorized'], 401);
            }
        }

        $hmacSecret = trim((string) config('services.shippo.webhook_hmac_secret', ''));
        if ($hmacSecret === '') {
            return null;
        }

        // Shippo: Shippo-Auth-Signature: t=<unix>,v1=<hex> (see webhook security docs)
        $sigHeader = (string) $request->header('Shippo-Auth-Signature', '');

        if ($sigHeader === '' || ! preg_match('/t=(\d+),v1=([a-fA-F0-9]+)/', $sigHeader, $m)) {
            Log::warning('Shippo webhook: missing or invalid Shippo-Auth-Signature header');

            return response()->json(['ok' => false, 'error' => 'Unauthorized'], 401);
        }

        $timestamp = $m[1];
        $signature = strtolower($m[2]);
        $ts = (int) $timestamp;
        if ($ts > 0 && abs(time() - $ts) > 900) {
            Log::warning('Shippo webhook: timestamp outside 15-minute tolerance');

            return response()->json(['ok' => false, 'error' => 'Unauthorized'], 401);
        }

        $signedPayload = $timestamp.'.'.$rawBody;
        $expected = hash_hmac('sha256', $signedPayload, $hmacSecret);

        if (! hash_equals($expected, $signature)) {
            Log::warning('Shippo webhook: HMAC mismatch');

            return response()->json(['ok' => false, 'error' => 'Unauthorized'], 401);
        }

        return null;
    }

    public function handle(Request $request): JsonResponse
    {
        $raw = (string) $request->getContent();

        if ($unauthorized = $this->verifyWebhookRequest($request, $raw)) {
            return $unauthorized;
        }

        $payload = json_decode($raw, true);

        if (! is_array($payload)) {
            return response()->json(['ok' => false, 'error' => 'Invalid JSON'], 400);
        }

        $payloadHash = hash('sha256', $raw);

        try {
            $result = $this->trackingService->handleTrackUpdated($payload, $payloadHash);

            // For webhook retries: return 200 when we successfully handled/ignored/duplicate.
            // If processing fails due to transient issues, we return 500 from the catch below.
            return response()->json(['ok' => true, 'result' => $result], 200);
        } catch (\Throwable $e) {
            Log::error('Shippo webhook processing error', [
                'error' => $e->getMessage(),
                'payload_hash' => $payloadHash,
            ]);

            return response()->json(['ok' => false, 'error' => 'Webhook processing failed'], 500);
        }
    }
}
