<?php

namespace Tests\Unit\Services;

use App\Services\GiftCardService;
use ReflectionMethod;
use Tests\TestCase;

class GiftCardServicePhazeSignatureTest extends TestCase
{
    public function test_normalize_phaze_price_avoids_float_noise_for_cents(): void
    {
        $service = new GiftCardService;
        $method = new ReflectionMethod(GiftCardService::class, 'normalizePhazePrice');
        $method->setAccessible(true);

        $this->assertSame(0.49, $method->invoke($service, 0.49000000000000005));
        $this->assertSame(5, $method->invoke($service, 5.0));
        $this->assertSame(5, $method->invoke($service, '5.00'));
    }

    public function test_signature_uses_exact_preencoded_body_string(): void
    {
        config([
            'services.phaze.api_secret' => 'test-secret',
        ]);

        $service = new GiftCardService;

        $encode = new ReflectionMethod(GiftCardService::class, 'encodeJsonBody');
        $encode->setAccessible(true);

        $sign = new ReflectionMethod(GiftCardService::class, 'generateSignature');
        $sign->setAccessible(true);

        $payload = [
            'orderId' => '92e38516-4fa1-4eaf-a166-4eb2074abbfc',
            'productId' => 10111329033,
            'price' => 0.49,
            'externalUserId' => '42',
        ];

        $rawBody = $encode->invoke($service, $payload);
        $fromString = $sign->invoke($service, 'POST', '/purchase', $rawBody);
        $fromArray = $sign->invoke($service, 'POST', '/purchase', $payload);

        $this->assertSame($fromString, $fromArray);
        $this->assertSame(
            hash('sha256', 'POST/purchase'.'test-secret'.$rawBody),
            $fromString
        );
        $this->assertStringContainsString('"price":0.49', $rawBody);
    }

    public function test_humanize_signature_and_balance_errors(): void
    {
        $service = new GiftCardService;

        $this->assertStringContainsString(
            'signature mismatch',
            strtolower($service->humanizePhazeErrorForAdmin([
                'httpStatusCode' => 400,
                'error' => 'Signature did not match',
            ]))
        );

        $this->assertStringContainsString(
            'prefund',
            strtolower($service->humanizePhazeErrorForAdmin([
                'httpStatusCode' => 402,
                'error' => 'Account Balance too low. Account must be pre-funded.',
            ]))
        );

        $this->assertStringContainsString(
            'temporarily unavailable',
            strtolower($service->humanizePhazeErrorForUser([
                'httpStatusCode' => 402,
                'error' => 'Account Balance too low.',
            ]))
        );
    }
}
