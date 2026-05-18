<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\BaseController;
use App\Models\FundraiseLead;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FundraiseLeadController extends BaseController
{
    /**
     * List qualified leads from the /fundraise funnel (Option 3).
     * These are founders who filled Name, Company, Email, Project summary and continued to Wefunder.
     */
    public function index(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        $leads = FundraiseLead::query()
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        $leads->getCollection()->transform(fn (FundraiseLead $lead) => [
            'id' => $lead->id,
            'name' => $lead->name,
            'company' => $lead->company,
            'email' => $lead->email,
            'project_summary' => $lead->project_summary,
            'created_at' => $lead->created_at->toIso8601String(),
        ]);

        return Inertia::render('admin/FundraiseLeads/Index', [
            'leads' => $leads,
            'total' => FundraiseLead::count(),
        ]);
    }
}
