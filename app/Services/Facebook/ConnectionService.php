<?php

namespace App\Services\Facebook;

use App\Models\FacebookAccount;
use App\Models\Organization;

class ConnectionService
{
    protected $postService;

    public function __construct(PostService $postService)
    {
        $this->postService = $postService;
    }

    public function isOrganizationConnected(Organization $organization): bool
    {
        $account = FacebookAccount::where('organization_id', $organization->id)
            ->connected()
            ->first();

        if (!$account) {
            return false;
        }

        return $this->postService->testConnection($account);
    }

    public function getConnectedAccount(Organization $organization): ?FacebookAccount
    {
        return FacebookAccount::where('organization_id', $organization->id)
            ->connected()
            ->first();
    }
}
