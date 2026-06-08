<?php

namespace App\Console\Commands;

use App\Http\Controllers\BridgeWalletController;
use App\Models\BridgeIntegration;
use App\Models\Organization;
use App\Models\User;
use App\Services\BridgeService;
use Illuminate\Console\Command;

class SyncBridgeCustomer extends Command
{
    protected $signature = 'bridge:sync-customer
                            {--email= : Bridge customer email to link}
                            {--user-id= : Local user ID}
                            {--organization-id= : Local organization ID}
                            {--customer-id= : Bridge customer UUID (optional if email given)}';

    protected $description = 'Link and sync an existing Bridge customer into bridge_integrations by email or ID';

    public function handle(BridgeService $bridgeService): int
    {
        $email = $this->option('email');
        $userId = $this->option('user-id');
        $organizationId = $this->option('organization-id');
        $customerId = $this->option('customer-id');

        if (! $email && ! $customerId) {
            $this->error('Provide --email= or --customer-id=');

            return 1;
        }

        if (! $userId && ! $organizationId) {
            $this->error('Provide --user-id= or --organization-id=');

            return 1;
        }

        if ($organizationId) {
            $organization = Organization::find($organizationId);
            if (! $organization) {
                $this->error("Organization {$organizationId} not found");

                return 1;
            }
            $entity = $organization;
            $entityType = Organization::class;
            $user = $organization->users()->first() ?? User::find($userId);
            $isOrgUser = true;
        } else {
            $user = User::find($userId);
            if (! $user) {
                $this->error("User {$userId} not found");

                return 1;
            }
            $entity = $user;
            $entityType = User::class;
            $isOrgUser = false;
        }

        if (! $user) {
            $this->error('Could not resolve a user for Bridge sync');

            return 1;
        }

        $controller = new BridgeWalletController($bridgeService);
        $reflection = new \ReflectionClass($controller);

        if ($customerId) {
            $integration = BridgeIntegration::resolveForEntity($entity->id, $entityType, $customerId);
            $integration->bridge_customer_id = $customerId;
            $integration->save();

            $sync = $reflection->getMethod('syncIntegrationFromBridgeApi');
            $sync->setAccessible(true);
            $sync->invoke($controller, $integration, $isOrgUser);
            $integration->refresh();
        } else {
            $link = $reflection->getMethod('linkBridgeCustomerByEmail');
            $link->setAccessible(true);
            $integration = $link->invoke($controller, $entity, $entityType, $user, $isOrgUser, null);
            if (! $integration) {
                $this->error("No Bridge customer found for email: {$email}");

                return 1;
            }
        }

        $this->info('Bridge customer synced.');
        $this->table(
            ['Field', 'Value'],
            [
                ['integration_id', (string) $integration->id],
                ['bridge_customer_id', (string) $integration->bridge_customer_id],
                ['kyb_status', (string) $integration->kyb_status],
                ['kyc_status', (string) $integration->kyc_status],
                ['tos_status', (string) $integration->tos_status],
                ['bridge_wallet_id', (string) ($integration->bridge_wallet_id ?? '')],
            ],
        );

        return 0;
    }
}
