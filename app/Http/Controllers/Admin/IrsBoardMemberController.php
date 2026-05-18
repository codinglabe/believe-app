<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\BaseController;
use App\Models\ExcelData;
use App\Models\IrsBoardMember;
use App\Models\Organization;
use Illuminate\Http\Request;
use Inertia\Inertia;

class IrsBoardMemberController extends BaseController
{
    /**
     * Display a paginated listing of IRS board members (admin only), grouped by EIN with organization name.
     */
    public function index(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        $query = IrsBoardMember::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('position', 'like', "%{$search}%")
                    ->orWhere('ein', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('tax_year')) {
            $query->where('tax_year', $request->tax_year);
        }

        $members = $query->orderBy('ein')
            ->orderBy('tax_year', 'desc')
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        $eins = $members->getCollection()->pluck('ein')->unique()->values()->all();
        $cleanEins = array_values(array_unique(array_map(fn ($e) => preg_replace('/\D/', '', (string) $e), $eins)));

        $orgs = collect();
        if (! empty($cleanEins)) {
            $placeholders = implode(',', array_fill(0, count($cleanEins), '?'));
            $orgs = Organization::query()
                ->whereRaw("REPLACE(REPLACE(ein, '-', ''), ' ', '') IN ({$placeholders})", $cleanEins)
                ->get(['id', 'name', 'ein']);
        }

        $einToName = [];
        $registeredEins = [];
        foreach ($orgs as $org) {
            $clean = preg_replace('/\D/', '', (string) $org->ein);
            $einToName[$clean] = $org->name;
            $registeredEins[$clean] = true;
        }

        if (! empty($cleanEins)) {
            $placeholders = implode(',', array_fill(0, count($cleanEins), '?'));
            $excelRows = ExcelData::query()
                ->whereRaw("REPLACE(REPLACE(COALESCE(ein, ''), '-', ''), ' ', '') IN ({$placeholders})", $cleanEins)
                ->get(['ein', 'name_virtual']);
            foreach ($excelRows as $row) {
                $clean = preg_replace('/\D/', '', (string) $row->ein);
                if (! isset($einToName[$clean]) && ! empty($row->name_virtual)) {
                    $einToName[$clean] = $row->name_virtual;
                }
            }
        }

        $groups = [];
        foreach ($members->getCollection() as $member) {
            $cleanEin = preg_replace('/\D/', '', (string) $member->ein);
            $key = $member->ein;
            if (! isset($groups[$key])) {
                $groups[$key] = [
                    'ein' => $member->ein,
                    'organization_name' => $einToName[$cleanEin] ?? null,
                    'is_registered' => isset($registeredEins[$cleanEin]),
                    'members' => [],
                ];
            }
            $groups[$key]['members'][] = $member;
        }
        $groups = array_values($groups);

        $stats = [
            'total' => IrsBoardMember::count(),
            'active' => IrsBoardMember::active()->count(),
            'inactive' => IrsBoardMember::whereIn('status', ['inactive', 'expired', 'removed'])->count(),
            'unique_eins' => (int) IrsBoardMember::query()->select('ein')->distinct()->count('ein'),
        ];

        $taxYears = IrsBoardMember::query()
            ->select('tax_year')
            ->whereNotNull('tax_year')
            ->distinct()
            ->orderByDesc('tax_year')
            ->pluck('tax_year')
            ->map(fn ($y) => (string) $y)
            ->values()
            ->all();

        return Inertia::render('admin/irs-members/Index', [
            'members' => $members,
            'groups' => $groups,
            'stats' => $stats,
            'taxYears' => $taxYears,
            'filters' => [
                'search' => $request->search ?? '',
                'status' => $request->status ?? 'all',
                'tax_year' => $request->tax_year ?? '',
            ],
        ]);
    }
}
