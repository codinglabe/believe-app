<?php

namespace App\Jobs;

use App\Services\StripePaymentSettingsProvisioningService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Optional background run of Stripe provisioning (admin save runs synchronously by default).
 */
class StripePaymentSettingsProvisioningJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function displayName(): string
    {
        return 'Stripe payment settings provisioning';
    }

    /**
     * @param  array<string, mixed>  $context
     */
    public function __construct(
        public int $adminUserId,
        public string $activeEnvironment,
        public array $context = []
    ) {}

    public function handle(StripePaymentSettingsProvisioningService $provisioning): void
    {
        Log::info('Stripe payment settings provisioning (queued)', array_merge([
            'admin_user_id' => $this->adminUserId,
            'active_environment' => $this->activeEnvironment,
        ], $this->context));

        $provisioning->provisionAfterAdminSave(
            $this->adminUserId,
            $this->activeEnvironment,
            (bool) ($this->context['credentials_changed'] ?? true),
            true,
        );
    }
}
