<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Services\SupporterPrimaryOrganizationService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationSupportersController extends Controller
{
    private const TABS = ['primary', 'secondary', 'activity'];

    public function __construct(
        private readonly SupporterPrimaryOrganizationService $primaryOrgService,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $user->organization;

        if ($organization === null || (int) $organization->user_id !== (int) $user->id) {
            abort(403, 'Unauthorized');
        }

        $tab = $request->input('tab');
        $tab = in_array($tab, self::TABS, true) ? $tab : 'primary';

        $searchQuery = trim((string) $request->input('q', ''));
        if (strlen($searchQuery) > 100) {
            $searchQuery = substr($searchQuery, 0, 100);
        }

        $counts = $this->primaryOrgService->supporterCountsForOrganization($organization);

        $primarySupporters = [];
        $secondarySupporters = [];
        $changeLogs = [];

        switch ($tab) {
            case 'primary':
                $primarySupporters = $this->primaryOrgService->primarySupportersForOrganization(
                    $organization,
                    100,
                    $searchQuery !== '' ? $searchQuery : null,
                );
                break;
            case 'secondary':
                $secondarySupporters = $this->primaryOrgService->secondarySupportersForOrganization(
                    $organization,
                    100,
                    $searchQuery !== '' ? $searchQuery : null,
                );
                break;
            case 'activity':
                $changeLogs = $this->primaryOrgService->changeLogsForOrganization($organization, 50);
                break;
        }

        return Inertia::render('Organization/Supporters/Index', [
            'activeTab' => $tab,
            'searchQuery' => $searchQuery,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'ein' => $organization->ein,
            ],
            'primarySupporters' => $primarySupporters,
            'secondarySupporters' => $secondarySupporters,
            'primarySupportersCount' => $counts['primary_count'],
            'secondarySupportersCount' => $counts['secondary_count'],
            'changeLogsCount' => $counts['change_logs_count'],
            'changeLogs' => $changeLogs,
        ]);
    }
}
