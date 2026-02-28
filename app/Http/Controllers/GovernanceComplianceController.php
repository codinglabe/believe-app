<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class GovernanceComplianceController extends Controller
{
    public function index(Request $request)
    {
        $organization = $request->user()->organization;

        if (!$organization) {
            return redirect()->route('dashboard')->with('error', 'No organization found.');
        }

        $meta = $organization->tax_compliance_meta ?? [];
        $einFormatted = $organization->ein
            ? preg_replace('/\D/', '', $organization->ein)
            : '';
        if (strlen($einFormatted) === 9) {
            $einFormatted = substr($einFormatted, 0, 2) . '-' . substr($einFormatted, 2);
        }

        $statusCode = $organization->tax_compliance_status;
        if (in_array($statusCode, ['compliant', 'current'], true)) {
            $statusCode = 'Active';
        } elseif (is_string($statusCode)) {
            $statusCode = ucfirst(str_replace('_', ' ', $statusCode));
        } else {
            $statusCode = null;
        }

        $revocationStatus = $meta['revocation_status'] ?? null;
        if ($revocationStatus === null && in_array($organization->tax_compliance_status, ['compliant', 'current'], true)) {
            $revocationStatus = 'Active';
        }

        $nteeDisplay = $organization->ntee_code;
        if ($nteeDisplay && !empty($meta['ntee_description'])) {
            $nteeDisplay = $organization->ntee_code . ' - ' . $meta['ntee_description'];
        }

        $scheduleRequirements = $meta['schedule_requirements'] ?? [];

        return Inertia::render('governance/Compliance', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'ein' => $organization->ein,
                'ein_formatted' => $einFormatted ?: $organization->ein,
                'classification' => $organization->classification,
                'filing_req' => $organization->filing_req,
                'ntee_code' => $organization->ntee_code,
                'deductibility' => $organization->deductibility,
                'ruling' => $organization->ruling,
                'tax_period' => $organization->tax_period,
                'tax_compliance_status' => $organization->tax_compliance_status,
                'tax_compliance_meta' => $organization->tax_compliance_meta,
            ],
            'complianceOverview' => [
                'last_filed_type' => $meta['last_filed_type'] ?? $organization->filing_req,
                'last_filed_date' => $meta['last_filed_date'] ?? null,
                'revocation_status' => $revocationStatus,
                'subsection' => $organization->classification,
                'organization_legal_name' => $organization->name,
                'filing_requirement_code' => $organization->filing_req,
                'deductibility_code' => $organization->deductibility,
                'public_charity_status' => $meta['public_charity_status'] ?? null,
                'rule_date' => $meta['exempt_since'] ?? $organization->ruling,
                'ntee_code' => $nteeDisplay,
                'tax_year_end' => $meta['tax_year_end'] ?? null,
                'status_code' => $statusCode,
            ],
            'scheduleRequirements' => $scheduleRequirements,
        ]);
    }
}
