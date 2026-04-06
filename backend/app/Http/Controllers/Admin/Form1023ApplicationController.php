<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Form1023Application;
use App\Mail\Form1023Approved;
use App\Mail\Form1023Declined;
use App\Mail\Form1023NeedsMoreInfo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Spatie\Permission\Models\Role;
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

        $oldStatus = $application->status;
        $newStatus = $request->input('status');
        $message = $request->input('message');

        $application->status = $newStatus;
        $application->reviewed_at = now();
        $application->reviewed_by = $request->user()->id;
        
        // Store review message in meta
        $meta = $application->meta ?? [];
        $meta['review_message'] = $message;
        $meta['reviewed_at'] = now()->toIso8601String();
        $application->meta = $meta;
        
        $application->save();

        // Handle role assignment based on status
        if ($application->organization && $application->organization->user) {
            if ($newStatus === 'approved') {
                // If approved, assign organization role to the user
                $this->assignOrganizationRole($application->organization->user);
            } elseif ($newStatus === 'declined' && $oldStatus === 'approved') {
                // If declining an approved application, revert to organization_pending role
                $this->revertToPendingRole($application->organization->user);
            }
        }

        // Send email notification via queue if status changed
        if ($oldStatus !== $newStatus) {
            // Ensure relationships are loaded before queuing
            $application->load('organization.user');
            
            if ($application->organization && $application->organization->user) {
                try {
                    switch ($newStatus) {
                        case 'approved':
                            Mail::to($application->organization->user->email)
                                ->queue(new Form1023Approved($application, $message));
                            break;
                        case 'declined':
                            Mail::to($application->organization->user->email)
                                ->queue(new Form1023Declined($application, $message));
                            break;
                        case 'needs_more_info':
                            Mail::to($application->organization->user->email)
                                ->queue(new Form1023NeedsMoreInfo($application, $message));
                            break;
                    }
                } catch (\Exception $e) {
                    // Log error but don't fail the request
                    Log::error('Failed to send Form 1023 status email', [
                        'application_id' => $application->id,
                        'status' => $newStatus,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        return redirect()->back()->with('success', 'Application status updated successfully. Email notification has been sent.');
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
        
        $oldStatus = $application->status;
        $application->status = 'needs_more_info'; // Set status to needs_more_info when document is rejected
        $application->reviewed_at = now();
        $application->reviewed_by = $request->user()->id;
        $application->save();

        // Send email notification via queue if status changed to needs_more_info
        if ($oldStatus !== 'needs_more_info' && $application->organization && $application->organization->user) {
            try {
                $message = "A document has been rejected. Reason: {$reason}. Please review and re-upload the required document.";
                Mail::to($application->organization->user->email)
                    ->queue(new Form1023NeedsMoreInfo($application, $message));
            } catch (\Exception $e) {
                // Log error but don't fail the request
                \Log::error('Failed to send Form 1023 document rejection email', [
                    'application_id' => $application->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

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

    /**
     * Assign organization role and remove organization_pending role
     */
    private function assignOrganizationRole($user): void
    {
        if (!$user) {
            return;
        }

        // Only assign role for organization users, not admins
        if ($user->role === 'admin') {
            return;
        }

        $organization = $user->organization;
        if (!$organization) {
            Log::warning('Cannot assign organization role: user has no organization', [
                'user_id' => $user->id,
                'user_role' => $user->role,
            ]);
            return;
        }

        try {
            // Ensure organization role exists with guard
            $organizationRole = Role::firstOrCreate(
                ['name' => 'organization', 'guard_name' => 'web']
            );

            // Remove organization_pending role if it exists
            if ($user->hasRole('organization_pending')) {
                $user->removeRole('organization_pending');
            }

            // Assign organization role (this will remove all other roles and assign only this one)
            $user->syncRoles([$organizationRole]);

            // Update user's role field
            $user->role = 'organization';
            $user->save();

            // Set organization registration_status to approved when organization role is assigned
            if ($organization->registration_status !== 'approved') {
                $organization->registration_status = 'approved';
                $organization->save();
            }

            // Clear permission cache to ensure changes take effect immediately
            app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

            // Refresh user model to ensure roles are updated
            $user->refresh();

            Log::info('Role assigned successfully from Form 1023 approval', [
                'user_id' => $user->id,
                'old_role' => $user->getOriginal('role'),
                'new_role' => 'organization',
                'roles' => $user->getRoleNames()->toArray(),
                'organization_registration_status' => $organization->registration_status,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to assign organization role', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    /**
     * Revert user to organization_pending role when declining an approved application
     */
    private function revertToPendingRole($user): void
    {
        if (!$user) {
            return;
        }

        // Only revert role for organization users, not admins
        if ($user->role === 'admin') {
            return;
        }

        $organization = $user->organization;
        if (!$organization) {
            Log::warning('Cannot revert role: user has no organization', [
                'user_id' => $user->id,
                'user_role' => $user->role,
            ]);
            return;
        }

        try {
            // Ensure organization_pending role exists with guard
            $pendingRole = Role::firstOrCreate(
                ['name' => 'organization_pending', 'guard_name' => 'web']
            );

            // Remove organization role if it exists
            if ($user->hasRole('organization')) {
                $user->removeRole('organization');
            }

            // Assign organization_pending role
            $user->syncRoles([$pendingRole]);

            // Update user's role field
            $user->role = 'organization_pending';
            $user->save();

            // Set organization registration_status to pending when application is declined
            if ($organization->registration_status === 'approved') {
                $organization->registration_status = 'pending';
                $organization->save();
            }

            // Clear permission cache to ensure changes take effect immediately
            app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

            // Refresh user model to ensure roles are updated
            $user->refresh();

            Log::info('Role reverted to organization_pending after declining approved Form 1023', [
                'user_id' => $user->id,
                'old_role' => $user->getOriginal('role'),
                'new_role' => 'organization_pending',
                'roles' => $user->getRoleNames()->toArray(),
                'organization_registration_status' => $organization->registration_status,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to revert organization role', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }
}

