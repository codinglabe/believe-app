<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\NonprofitExemptionCertificate;
use App\Models\StateSalesTax;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ExemptionCertificateController extends Controller
{
    /**
     * Display a listing of exemption certificates
     */
    public function index(Request $request): Response
    {
        $query = NonprofitExemptionCertificate::with(['user', 'organization', 'approvedBy'])
            ->orderBy('created_at', 'desc');

        // Filter by status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filter by state
        if ($request->has('state_code') && $request->state_code) {
            $query->where('state_code', $request->state_code);
        }

        $certificates = $query->paginate(20)->through(function ($cert) {
            return [
                'id' => $cert->id,
                'user' => [
                    'id' => $cert->user->id,
                    'name' => $cert->user->name,
                    'email' => $cert->user->email,
                ],
                'organization' => $cert->organization ? [
                    'id' => $cert->organization->id,
                    'name' => $cert->organization->name,
                ] : null,
                'state_code' => $cert->state_code,
                'state' => StateSalesTax::where('state_code', $cert->state_code)->first()?->state ?? $cert->state_code,
                'certificate_file_path' => $cert->certificate_file_path ? Storage::url($cert->certificate_file_path) : null,
                'certificate_number' => $cert->certificate_number,
                'issued_date' => $cert->issued_date?->format('Y-m-d'),
                'expiry_date' => $cert->expiry_date?->format('Y-m-d'),
                'status' => $cert->status,
                'isExpired' => $cert->isExpired(),
                'isValid' => $cert->isValid(),
                'notes' => $cert->notes,
                'approved_by' => $cert->approvedBy ? [
                    'id' => $cert->approvedBy->id,
                    'name' => $cert->approvedBy->name,
                ] : null,
                'approved_at' => $cert->approved_at?->format('Y-m-d H:i:s'),
                'created_at' => $cert->created_at->format('Y-m-d H:i:s'),
            ];
        });

        $states = StateSalesTax::orderBy('state')->get(['state', 'state_code']);

        return Inertia::render('admin/exemption-certificates/Index', [
            'certificates' => $certificates,
            'states' => $states,
            'filters' => [
                'status' => $request->status ?? 'all',
                'state_code' => $request->state_code ?? '',
            ],
        ]);
    }

    /**
     * Display the specified exemption certificate
     */
    public function show(NonprofitExemptionCertificate $exemptionCertificate): Response
    {
        $certificate = $exemptionCertificate->load(['user', 'organization', 'approvedBy']);

        return Inertia::render('admin/exemption-certificates/Show', [
            'certificate' => [
                'id' => $certificate->id,
                'user' => [
                    'id' => $certificate->user->id,
                    'name' => $certificate->user->name,
                    'email' => $certificate->user->email,
                ],
                'organization' => $certificate->organization ? [
                    'id' => $certificate->organization->id,
                    'name' => $certificate->organization->name,
                ] : null,
                'state_code' => $certificate->state_code,
                'state' => StateSalesTax::where('state_code', $certificate->state_code)->first()?->state ?? $certificate->state_code,
                'certificate_file_path' => $certificate->certificate_file_path ? Storage::url($certificate->certificate_file_path) : null,
                'certificate_number' => $certificate->certificate_number,
                'issued_date' => $certificate->issued_date?->format('Y-m-d'),
                'expiry_date' => $certificate->expiry_date?->format('Y-m-d'),
                'status' => $certificate->status,
                'isExpired' => $certificate->isExpired(),
                'isValid' => $certificate->isValid(),
                'notes' => $certificate->notes,
                'approved_by' => $certificate->approvedBy ? [
                    'id' => $certificate->approvedBy->id,
                    'name' => $certificate->approvedBy->name,
                ] : null,
                'approved_at' => $certificate->approved_at?->format('Y-m-d H:i:s'),
                'created_at' => $certificate->created_at->format('Y-m-d H:i:s'),
            ],
        ]);
    }

    /**
     * Approve an exemption certificate
     */
    public function approve(Request $request, NonprofitExemptionCertificate $exemptionCertificate)
    {
        $validated = $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        $exemptionCertificate->update([
            'status' => 'approved',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
            'notes' => $validated['notes'] ?? $exemptionCertificate->notes,
        ]);

        return back()->with('success', 'Exemption certificate approved successfully.');
    }

    /**
     * Reject an exemption certificate
     */
    public function reject(Request $request, NonprofitExemptionCertificate $exemptionCertificate)
    {
        $validated = $request->validate([
            'notes' => 'required|string|max:1000',
        ]);

        $exemptionCertificate->update([
            'status' => 'rejected',
            'notes' => $validated['notes'],
        ]);

        return back()->with('success', 'Exemption certificate rejected successfully.');
    }
}
