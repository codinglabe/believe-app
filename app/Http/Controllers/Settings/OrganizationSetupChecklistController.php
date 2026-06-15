<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Services\OrganizationSetupChecklistService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationSetupChecklistController extends Controller
{
    public function __construct(
        private readonly OrganizationSetupChecklistService $checklistService,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = Organization::forAuthUser($user);

        if (! $organization) {
            abort(403, 'Organization profile required.');
        }

        $checklist = $this->checklistService->forOrganization($organization, $user);

        return Inertia::render('settings/setup-checklist', [
            'checklist' => $checklist,
            'organizationName' => $organization->name,
        ]);
    }
}
