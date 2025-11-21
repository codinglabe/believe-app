<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ComplianceApplication;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class ComplianceApplicationController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->query('status');
        $search = $request->query('search');

        $applications = ComplianceApplication::with(['organization.user'])
            ->when($status && $status !== 'all', fn ($query) => $query->where('status', $status))
            ->when($search, function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('application_number', 'like', "%{$search}%")
                      ->orWhereHas('organization', function ($orgQuery) use ($search) {
                          $orgQuery->where('name', 'like', "%{$search}%");
                      });
                });
            })
            ->latest()
            ->paginate(20)
            ->through(function (ComplianceApplication $application) {
                return [
                    'id' => $application->id,
                    'application_number' => $application->application_number,
                    'status' => $application->status,
                    'payment_status' => $application->payment_status,
                    'assistance_types' => $application->assistance_types,
                    'amount' => $application->amount,
                    'submitted_at' => optional($application->submitted_at)?->toIso8601String(),
                    'organization' => [
                        'id' => $application->organization->id,
                        'name' => $application->organization->name,
                        'registration_status' => $application->organization->registration_status,
                        'is_compliance_locked' => (bool) $application->organization->is_compliance_locked,
                    ],
                ];
            });

        return Inertia::render('admin/compliance/Index', [
            'applications' => $applications,
            'filters' => [
                'status' => $status,
                'search' => $search,
            ],
        ]);
    }

    public function show(ComplianceApplication $application)
    {
        $application->load(['organization.user']);

        return Inertia::render('admin/compliance/Show', [
            'application' => [
                'id' => $application->id,
                'application_number' => $application->application_number,
                'status' => $application->status,
                'payment_status' => $application->payment_status,
                'assistance_types' => $application->assistance_types,
                'description' => $application->description,
                'amount' => $application->amount,
                'currency' => $application->currency,
                'documents' => collect($application->documents)->map(fn ($doc) => [
                    'name' => $doc['name'] ?? basename($doc['path'] ?? ''),
                    'url' => isset($doc['path']) ? Storage::disk('public')->url($doc['path']) : null,
                ]),
                'submitted_at' => optional($application->submitted_at)->toIso8601String(),
                'organization' => [
                    'id' => $application->organization->id,
                    'name' => $application->organization->name,
                    'registration_status' => $application->organization->registration_status,
                    'is_compliance_locked' => (bool) $application->organization->is_compliance_locked,
                ],
                'contact' => [
                    'name' => $application->contact_name,
                    'email' => $application->contact_email,
                    'phone' => $application->contact_phone,
                ],
                'meta' => $application->meta,
            ],
        ]);
    }

    public function update(Request $request, ComplianceApplication $application)
    {
        $request->validate([
            'status' => ['sometimes', Rule::in(['approved', 'needs_more_info', 'declined'])],
            'message' => ['nullable', 'string', 'max:2000'],
            'amount' => ['sometimes', 'numeric', 'min:0'],
        ]);

        if ($request->has('amount')) {
            $application->amount = $request->input('amount');
            $application->save();
            return back()->with('success', 'Application fee updated successfully.');
        }

        $status = $request->input('status');
        $message = $request->input('message');

        if ($status) {
            $application->status = $status;
            $application->reviewed_at = now();
            $application->reviewed_by = $request->user()->id;
            $application->meta = array_merge($application->meta ?? [], [
                'review_message' => $message,
                'reviewed_at' => now()->toIso8601String(),
            ]);

            if ($status === 'approved') {
                $this->approveOrganization($application->organization);
                $application->payment_status = 'paid';
            }

            if ($status === 'needs_more_info') {
                $application->payment_status = 'paid';
            }

            if ($status === 'declined') {
                $application->payment_status = $application->payment_status ?: 'paid';
            }

            $application->save();
        }

        return back()->with('success', 'Application updated successfully.');
    }

    protected function approveOrganization(Organization $organization): void
    {
        $organization->tax_compliance_status = 'current';
        $organization->tax_compliance_checked_at = now();
        $organization->tax_compliance_meta = array_merge($organization->tax_compliance_meta ?? [], [
            'last_reviewed_at' => now()->toIso8601String(),
        ]);
        $organization->is_compliance_locked = false;
        $organization->registration_status = 'approved';
        $organization->status = 'Active';
        $organization->save();

        $user = $organization->user;
        if (!$user) {
            return;
        }

        Role::findOrCreate('organization');

        $user->syncRoles(['organization']);
        if ($user->role !== 'organization') {
            $user->role = 'organization';
            $user->save();
        }
    }

    public function destroy(ComplianceApplication $application)
    {
        // Delete associated documents if any
        $documents = $application->documents;
        if ($documents && is_array($documents)) {
            foreach ($documents as $doc) {
                if (isset($doc['path']) && $doc['path']) {
                    Storage::disk('public')->delete($doc['path']);
                }
            }
        }

        $application->delete();

        return redirect()->route('admin.compliance.index')->with('success', 'Compliance application deleted successfully.');
    }
}

