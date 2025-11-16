<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Form1023Application;
use Illuminate\Http\Request;
use Inertia\Inertia;

class Form1023ApplicationController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->query('status');
        $search = $request->query('search');

        $applications = Form1023Application::with(['organization.user'])
            ->when($status && $status !== 'all', fn ($query) => $query->where('status', $status))
            ->when($search, function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('application_number', 'like', "%{$search}%")
                      ->orWhere('legal_name', 'like', "%{$search}%")
                      ->orWhere('ein', 'like', "%{$search}%")
                      ->orWhereHas('organization', function ($orgQuery) use ($search) {
                          $orgQuery->where('name', 'like', "%{$search}%")
                                   ->orWhere('ein', 'like', "%{$search}%");
                      });
                });
            })
            ->latest()
            ->paginate(20)
            ->through(function (Form1023Application $application) {
                return [
                    'id' => $application->id,
                    'application_number' => $application->application_number,
                    'status' => $application->status,
                    'payment_status' => $application->payment_status,
                    'amount' => $application->amount,
                    'submitted_at' => optional($application->submitted_at)?->toIso8601String(),
                    'organization' => [
                        'id' => $application->organization->id,
                        'name' => $application->organization->name,
                        'ein' => $application->organization->ein,
                        'registration_status' => $application->organization->registration_status,
                    ],
                ];
            });

        return Inertia::render('admin/form1023/Index', [
            'applications' => $applications,
            'filters' => [
                'status' => $status,
                'search' => $search,
            ],
        ]);
    }

    public function show(Form1023Application $application)
    {
        $application->load(['organization.user', 'reviewer']);

        return Inertia::render('admin/form1023/Show', [
            'application' => [
                'id' => $application->id,
                'application_number' => $application->application_number,
                'status' => $application->status,
                'payment_status' => $application->payment_status,
                'amount' => $application->amount,
                'currency' => $application->currency ?? 'USD',
                'stripe_session_id' => $application->stripe_session_id,
                'stripe_payment_intent' => $application->stripe_payment_intent,
                'submitted_at' => optional($application->submitted_at)?->toIso8601String(),
                'reviewed_at' => optional($application->reviewed_at)?->toIso8601String(),
                'admin_notes' => $application->admin_notes,
                'meta' => $application->meta,
                // A. Basic Organization Information
                'legal_name' => $application->legal_name,
                'mailing_address' => $application->mailing_address,
                'physical_address' => $application->physical_address,
                'ein' => $application->ein,
                'date_incorporated' => $application->date_incorporated?->format('Y-m-d'),
                'state_of_incorporation' => $application->state_of_incorporation,
                'organizational_structure' => $application->organizational_structure,
                'contact_phone' => $application->contact_phone,
                'contact_email' => $application->contact_email,
                'website' => $application->website,
                // B. Organizational Structure & Governance
                'organizing_documents' => $application->organizing_documents,
                'bylaws_document' => $application->bylaws_document,
                'officers_directors' => $application->officers_directors,
                'conflict_of_interest_policy_document' => $application->conflict_of_interest_policy_document,
                'organizational_chart_document' => $application->organizational_chart_document,
                'related_organizations' => $application->related_organizations,
                // C. Purpose & Activities
                'mission_statement' => $application->mission_statement,
                'activities' => $application->activities,
                'fundraising_materials' => $application->fundraising_materials,
                // D. Financial Information
                'financial_statements' => $application->financial_statements,
                'revenue_sources' => $application->revenue_sources,
                'budget_per_program' => $application->budget_per_program,
                'major_contributors' => $application->major_contributors,
                'fundraising_activities' => $application->fundraising_activities,
                'prior_year_tax_filings' => $application->prior_year_tax_filings,
                // E. Operational Details
                'compensation_arrangements' => $application->compensation_arrangements,
                'related_party_agreements' => $application->related_party_agreements,
                'political_activities_yes_no' => $application->political_activities_yes_no,
                'political_activities_desc' => $application->political_activities_desc,
                'grants' => $application->grants,
                'foreign_activities_yes_no' => $application->foreign_activities_yes_no,
                'foreign_activities_desc' => $application->foreign_activities_desc,
                // F. Supporting Documents
                'form_ss4_confirmation' => $application->form_ss4_confirmation,
                'board_meeting_minutes' => $application->board_meeting_minutes,
                'whistleblower_policy_document' => $application->whistleblower_policy_document,
                'organization' => [
                    'id' => $application->organization->id,
                    'name' => $application->organization->name,
                    'ein' => $application->organization->ein,
                    'registration_status' => $application->organization->registration_status,
                ],
                'reviewer' => $application->reviewer ? [
                    'id' => $application->reviewer->id,
                    'name' => $application->reviewer->name,
                    'email' => $application->reviewer->email,
                ] : null,
            ],
        ]);
    }

    public function update(Request $request, Form1023Application $application)
    {
        $request->validate([
            'status' => ['required', 'in:approved,needs_more_info,declined'],
            'message' => ['nullable', 'string', 'max:2000'],
        ]);

        $application->status = $request->input('status');
        $application->save();

        return redirect()->back()->with('success', 'Application status updated successfully.');
    }

    public function rejectDocument(Request $request, Form1023Application $application)
    {
        $request->validate([
            'field_name' => ['required', 'string'],
            'file_index' => ['nullable', 'integer'],
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $fieldName = $request->input('field_name');
        $fileIndex = $request->input('file_index');
        $reason = $request->input('reason');

        // Get rejected documents from meta or initialize
        $meta = $application->meta ?? [];
        $rejectedDocuments = $meta['rejected_documents'] ?? [];

        // Create rejection key
        $rejectionKey = $fileIndex !== null ? "{$fieldName}[{$fileIndex}]" : $fieldName;

        // Store rejection info
        $rejectedDocuments[$rejectionKey] = [
            'field_name' => $fieldName,
            'file_index' => $fileIndex,
            'reason' => $reason,
            'rejected_at' => now()->toIso8601String(),
            'rejected_by' => $request->user()->id,
        ];

        $meta['rejected_documents'] = $rejectedDocuments;
        $application->meta = $meta;
        $application->status = 'needs_more_info'; // Set status to needs_more_info when document is rejected
        $application->save();

        return redirect()->back()->with('success', 'Document rejected successfully. Organization will be notified to re-upload.');
    }

    public function destroy(Form1023Application $application)
    {
        // Delete associated files if any
        $fileFields = [
            'organizing_documents',
            'bylaws_document',
            'conflict_of_interest_policy_document',
            'organizational_chart_document',
            'fundraising_materials',
            'financial_statements',
            'prior_year_tax_filings',
            'form_ss4_confirmation',
            'board_meeting_minutes',
            'whistleblower_policy_document',
        ];

        foreach ($fileFields as $field) {
            $files = $application->$field;
            if ($files && is_array($files)) {
                foreach ($files as $file) {
                    if (isset($file['path']) && $file['path']) {
                        \Storage::disk('public')->delete($file['path']);
                    }
                }
            }
        }

        // Delete files from nested arrays
        if ($application->fundraising_activities && is_array($application->fundraising_activities)) {
            foreach ($application->fundraising_activities as $activity) {
                if (isset($activity['contract']) && is_array($activity['contract'])) {
                    foreach ($activity['contract'] as $file) {
                        if (isset($file['path']) && $file['path']) {
                            \Storage::disk('public')->delete($file['path']);
                        }
                    }
                }
            }
        }

        if ($application->related_party_agreements && is_array($application->related_party_agreements)) {
            foreach ($application->related_party_agreements as $agreement) {
                if (isset($agreement['document']) && is_array($agreement['document'])) {
                    foreach ($agreement['document'] as $file) {
                        if (isset($file['path']) && $file['path']) {
                            \Storage::disk('public')->delete($file['path']);
                        }
                    }
                }
            }
        }

        $application->delete();

        return redirect()->route('admin.form1023.index')->with('success', 'Application deleted successfully.');
    }

    public function updateAmount(Request $request, Form1023Application $application)
    {
        $request->validate([
            'amount' => ['required', 'numeric', 'min:0', 'max:10000'],
        ]);

        $application->update([
            'amount' => $request->input('amount'),
        ]);

        return redirect()->back()->with('success', 'Application fee updated successfully.');
    }
}

