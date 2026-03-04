<?php

namespace App\Http\Controllers;

use App\Models\ExcelData;
use App\Models\FoundationCode;
use App\Models\NteeCode;
use App\Models\StatusCode;
use App\Models\SubsectionCode;
use Illuminate\Http\Request;
use Inertia\Inertia;

class GovernanceComplianceController extends Controller
{
    /**
     * IRS EO BMF row_data column indices (from IRS BMF CSV / IrsBmfController).
     */
    private const BMF_NAME = 1;
    private const BMF_SUBSECTION = 8;
    private const BMF_RULING = 11;
    private const BMF_DEDUCTIBILITY = 12;
    private const BMF_FOUNDATION = 13;
    private const BMF_STATUS = 16;
    private const BMF_TAX_PERIOD = 17;
    private const BMF_NTEE_CD = 26;

    /**
     * Format IRS YYYYMM (e.g. 197002) to readable date (e.g. "Feb 1970").
     */
    private static function formatIrsYearMonth($value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        $s = preg_replace('/\D/', '', (string) $value);
        if (strlen($s) !== 6) {
            return (string) $value;
        }
        $y = substr($s, 0, 4);
        $m = (int) substr($s, 4, 2);
        if ($m < 1 || $m > 12) {
            return (string) $value;
        }
        $months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        return $months[$m] . ' ' . $y;
    }

    public function index(Request $request)
    {
        $organization = $request->user()->organization;

        if (! $organization) {
            return redirect()->route('dashboard')->with('error', 'No organization found.');
        }

        $meta = $organization->tax_compliance_meta ?? [];
        $einNormalized = $organization->ein ? preg_replace('/\D/', '', $organization->ein) : '';
        $einFormatted = (strlen($einNormalized) === 9)
            ? substr($einNormalized, 0, 2) . '-' . substr($einNormalized, 2)
            : ($organization->ein ?? '');

        // Prefer IRS BMF data when available (by EIN, 9 digits; BMF files only)
        $bmfRow = null;
        if (strlen($einNormalized) === 9) {
            $bmfRow = ExcelData::where(function ($q) use ($einNormalized) {
                $q->where('ein', $einNormalized)
                    ->orWhere('ein', substr($einNormalized, 0, 2) . '-' . substr($einNormalized, 2));
            })
                ->whereHas('uploadedFile', function ($q) {
                    $q->where('file_name', 'like', '%irs_bmf%');
                })
                ->first();
        }

        $rowData = $bmfRow && is_array($bmfRow->row_data) ? $bmfRow->row_data : null;

        // Subsection: must be 501(c)(X) from subsection code, NOT classification/category text
        $subsectionDisplay = null;
        if ($rowData !== null && isset($rowData[self::BMF_SUBSECTION])) {
            $code = $rowData[self::BMF_SUBSECTION];
            if (is_numeric($code)) {
                $subsectionDisplay = SubsectionCode::where('subsection_codes', (int) $code)->value('irs_code');
            }
            if ($subsectionDisplay === null && is_string($code)) {
                $subsectionDisplay = $code;
            }
        }
        if ($subsectionDisplay === null && ! empty($meta['subsection_irs_code'])) {
            $subsectionDisplay = $meta['subsection_irs_code'];
        }
        // Do NOT use organization->classification for subsection (that is category/description, not 501(c)(X))

        $statusCode = $organization->tax_compliance_status;
        if (in_array($statusCode, ['compliant', 'current'], true)) {
            $statusCode = 'Active';
        } elseif (is_string($statusCode)) {
            $statusCode = ucfirst(str_replace('_', ' ', $statusCode));
        } else {
            $statusCode = null;
        }
        if ($rowData !== null && isset($rowData[self::BMF_STATUS]) && (string) $rowData[self::BMF_STATUS] !== '') {
            $bmfStatusRaw = $rowData[self::BMF_STATUS];
            if (is_numeric($bmfStatusRaw)) {
                $code = (int) $bmfStatusRaw;
                $statusCode = in_array($code, [1, 2], true) ? 'Active' : (StatusCode::where('status_code', $code)->value('status') ?? (string) $bmfStatusRaw);
            } else {
                $statusCode = $bmfStatusRaw;
            }
        }

        $revocationStatus = $meta['revocation_status'] ?? null;
        if ($revocationStatus === null && in_array($organization->tax_compliance_status, ['compliant', 'current'], true)) {
            $revocationStatus = 'Active';
        }
        if ($rowData !== null && isset($rowData[self::BMF_STATUS]) && is_numeric($rowData[self::BMF_STATUS])) {
            $code = (int) $rowData[self::BMF_STATUS];
            $revocationStatus = in_array($code, [12, 25, 34], true) ? 'Revoked' : (in_array($code, [1, 2], true) ? 'Active' : $revocationStatus);
        }

        $organizationLegalName = $organization->name;
        if ($rowData !== null && ! empty($rowData[self::BMF_NAME])) {
            $organizationLegalName = $rowData[self::BMF_NAME];
        }

        $filingRequirementCode = $organization->filing_req;
        $deductibilityCode = $organization->deductibility;
        $ruleDate = $meta['exempt_since'] ?? $organization->ruling;
        $taxYearEnd = $meta['tax_year_end'] ?? null;
        $lastFiledType = $meta['last_filed_type'] ?? $organization->filing_req;
        $lastFiledDate = $meta['last_filed_date'] ?? null;
        $publicCharityStatus = $meta['public_charity_status'] ?? null;

        if ($rowData !== null) {
            if (isset($rowData[self::BMF_RULING]) && (string) $rowData[self::BMF_RULING] !== '') {
                $rawRuling = $rowData[self::BMF_RULING];
                $ruleDate = self::formatIrsYearMonth($rawRuling) ?? $rawRuling;
            }
            if (isset($rowData[self::BMF_DEDUCTIBILITY]) && (string) $rowData[self::BMF_DEDUCTIBILITY] !== '') {
                $deductibilityCode = $rowData[self::BMF_DEDUCTIBILITY];
            }
            if (isset($rowData[self::BMF_FOUNDATION]) && (string) $rowData[self::BMF_FOUNDATION] !== '') {
                $foundationCode = $rowData[self::BMF_FOUNDATION];
                if (is_numeric($foundationCode)) {
                    $publicCharityStatus = FoundationCode::where('foundation_codes', (int) $foundationCode)->value('foundation_type');
                }
                if ($publicCharityStatus === null) {
                    $publicCharityStatus = (string) $foundationCode;
                }
            }
            if (isset($rowData[self::BMF_TAX_PERIOD]) && (string) $rowData[self::BMF_TAX_PERIOD] !== '') {
                $rawTaxPeriod = $rowData[self::BMF_TAX_PERIOD];
                $taxYearEnd = self::formatIrsYearMonth($rawTaxPeriod) ?? $rawTaxPeriod;
            }
        }
        // Format rule_date when from org/meta (e.g. 197002 → Feb 1970)
        if ($ruleDate !== null && $ruleDate !== '' && preg_match('/^\d{6}$/', (string) $ruleDate)) {
            $ruleDate = self::formatIrsYearMonth($ruleDate) ?? $ruleDate;
        }
        if ($taxYearEnd !== null && $taxYearEnd !== '' && preg_match('/^\d{6}$/', (string) $taxYearEnd)) {
            $taxYearEnd = self::formatIrsYearMonth($taxYearEnd) ?? $taxYearEnd;
        }

        // Fallback: Tax Year End from organization.tax_period (YYYYMM) when BMF has none
        if (($taxYearEnd === null || $taxYearEnd === '') && ! empty($organization->tax_period) && preg_match('/^\d{6}$/', preg_replace('/\D/', '', $organization->tax_period))) {
            $taxYearEnd = self::formatIrsYearMonth($organization->tax_period);
        }

        // Last Filed Type & Date from Form 990 filings (synced from IRS or entered)
        $latest990 = $organization->getLatestForm990Filing();
        if ($latest990) {
            if ($lastFiledType === null || $lastFiledType === '') {
                $lastFiledType = $latest990->form_type ?? $organization->filing_req ?? '990';
            }
            if ($lastFiledDate === null || $lastFiledDate === '') {
                $lastFiledDate = $latest990->filing_date?->format('M j, Y') ?? $latest990->filing_date?->toDateString();
            }
            if (($taxYearEnd === null || $taxYearEnd === '') && ! empty($latest990->tax_year)) {
                $taxYearEnd = 'Dec ' . $latest990->tax_year;
            }
        }

        // Status Code fallback when BMF has no status: show Active for compliant/current orgs
        if (($statusCode === null || $statusCode === '') && in_array($organization->tax_compliance_status, ['compliant', 'current'], true)) {
            $statusCode = 'Active';
        }

        $nteeDisplay = $organization->ntee_code;
        if ($rowData !== null && isset($rowData[self::BMF_NTEE_CD]) && (string) $rowData[self::BMF_NTEE_CD] !== '') {
            $nteeDisplay = $rowData[self::BMF_NTEE_CD];
        }
        $nteeDescription = $meta['ntee_description'] ?? null;
        if ($nteeDisplay && empty($nteeDescription)) {
            $nteeDescription = NteeCode::where('ntee_codes', $nteeDisplay)->value('description');
        }
        if ($nteeDisplay && ! empty($nteeDescription)) {
            $nteeDisplay = $nteeDisplay . ' - ' . $nteeDescription;
        }

        $scheduleRequirements = $meta['schedule_requirements'] ?? [];
        $lastSyncedAt = $organization->tax_compliance_checked_at?->toIso8601String();

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
                'last_filed_type' => $lastFiledType,
                'last_filed_date' => $lastFiledDate,
                'revocation_status' => $revocationStatus,
                'subsection' => $subsectionDisplay,
                'organization_legal_name' => $organizationLegalName,
                'filing_requirement_code' => $filingRequirementCode,
                'deductibility_code' => $deductibilityCode,
                'public_charity_status' => $publicCharityStatus,
                'rule_date' => $ruleDate,
                'ntee_code' => $nteeDisplay,
                'tax_year_end' => $taxYearEnd,
                'status_code' => $statusCode,
            ],
            'scheduleRequirements' => $scheduleRequirements,
            'lastSyncedAt' => $lastSyncedAt,
            'dataSource' => $bmfRow ? 'BMF' : 'organization',
        ]);
    }
}
