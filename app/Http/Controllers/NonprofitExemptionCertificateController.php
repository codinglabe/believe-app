<?php

namespace App\Http\Controllers;

use App\Models\NonprofitExemptionCertificate;
use App\Models\StateSalesTax;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class NonprofitExemptionCertificateController extends Controller
{
    /**
     * Display the exemption certificates management page
     */
    public function index(): Response
    {
        $user = Auth::user();

        // Check if user has an organization
        if (!$user->organization) {
            return Inertia::render('settings/exemption-certificates', [
                'certificates' => [],
                'states' => StateSalesTax::orderBy('state')->get(['id', 'state', 'state_code', 'base_sales_tax_rate', 'requires_exemption_certificate']),
                'hasOrganization' => false,
            ]);
        }

        $certificates = NonprofitExemptionCertificate::where('user_id', $user->id)
            ->with(['organization'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($cert) {
                return [
                    'id' => $cert->id,
                    'state_code' => $cert->state_code,
                    'state' => StateSalesTax::where('state_code', $cert->state_code)->first()?->state ?? $cert->state_code,
                    'certificate_file_path' => $cert->certificate_file_path ? Storage::url($cert->certificate_file_path) : null,
                    'certificate_number' => $cert->certificate_number,
                    'issued_date' => $cert->issued_date?->format('Y-m-d'),
                    'expiry_date' => $cert->expiry_date?->format('Y-m-d'),
                    'status' => $cert->status,
                    'isValid' => $cert->isValid(),
                    'isExpired' => $cert->isExpired(),
                    'notes' => $cert->notes,
                    'created_at' => $cert->created_at->format('Y-m-d H:i'),
                ];
            });

        $states = StateSalesTax::orderBy('state')
            ->get(['id', 'state', 'state_code', 'base_sales_tax_rate']);

        return Inertia::render('settings/exemption-certificates', [
            'certificates' => $certificates,
            'states' => $states,
            'hasOrganization' => true,
        ]);
    }

    /**
     * Store a new exemption certificate
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        // Check if user has an organization
        if (!$user->organization) {
            return back()->withErrors(['error' => 'You must be associated with a nonprofit organization to upload exemption certificates.']);
        }

        $validated = $request->validate([
            'state_code' => 'required|string|size:2|exists:state_sales_taxes,state_code',
            'certificate_file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240', // 10MB max
            'certificate_number' => 'nullable|string|max:255',
            'issued_date' => 'nullable|date',
            'expiry_date' => 'nullable|date|after:issued_date',
            'notes' => 'nullable|string|max:1000',
        ]);

        // Check if state requires exemption certificate
        $stateTax = StateSalesTax::where('state_code', strtoupper($validated['state_code']))->first();
        if (!$stateTax || !$stateTax->requires_exemption_certificate) {
            return back()->withErrors(['state_code' => 'This state does not require an exemption certificate.']);
        }

        // Check if certificate already exists for this state
        $existing = NonprofitExemptionCertificate::where('user_id', $user->id)
            ->where('state_code', strtoupper($validated['state_code']))
            ->where('status', '!=', 'rejected')
            ->first();

        if ($existing) {
            return back()->withErrors(['state_code' => 'You already have a certificate for this state. Please update the existing one instead.']);
        }

        // Store the file
        $filePath = $request->file('certificate_file')->store('exemption-certificates', 'public');

        $certificate = NonprofitExemptionCertificate::create([
            'user_id' => $user->id,
            'organization_id' => $user->organization->id,
            'state_code' => strtoupper($validated['state_code']),
            'certificate_file_path' => $filePath,
            'certificate_number' => $validated['certificate_number'] ?? null,
            'issued_date' => $validated['issued_date'] ?? null,
            'expiry_date' => $validated['expiry_date'] ?? null,
            'status' => 'pending',
            'notes' => $validated['notes'] ?? null,
        ]);

        return back()->with('success', 'Exemption certificate uploaded successfully! It will be reviewed by our team.');
    }

    /**
     * Update an existing exemption certificate
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $certificate = NonprofitExemptionCertificate::where('user_id', $user->id)->findOrFail($id);

        // Can only update if pending or rejected
        if (!in_array($certificate->status, ['pending', 'rejected'])) {
            return back()->withErrors(['error' => 'You can only update pending or rejected certificates.']);
        }

        $validated = $request->validate([
            'certificate_file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'certificate_number' => 'nullable|string|max:255',
            'issued_date' => 'nullable|date',
            'expiry_date' => 'nullable|date|after:issued_date',
            'notes' => 'nullable|string|max:1000',
        ]);

        // Update file if provided
        if ($request->hasFile('certificate_file')) {
            // Delete old file
            if ($certificate->certificate_file_path && Storage::disk('public')->exists($certificate->certificate_file_path)) {
                Storage::disk('public')->delete($certificate->certificate_file_path);
            }
            $filePath = $request->file('certificate_file')->store('exemption-certificates', 'public');
            $certificate->certificate_file_path = $filePath;
        }

        $certificate->update([
            'certificate_number' => $validated['certificate_number'] ?? $certificate->certificate_number,
            'issued_date' => $validated['issued_date'] ?? $certificate->issued_date,
            'expiry_date' => $validated['expiry_date'] ?? $certificate->expiry_date,
            'notes' => $validated['notes'] ?? $certificate->notes,
            'status' => 'pending', // Reset to pending when updated
        ]);

        return back()->with('success', 'Exemption certificate updated successfully! It will be reviewed again.');
    }

    /**
     * Delete an exemption certificate
     */
    public function destroy($id)
    {
        $user = Auth::user();
        $certificate = NonprofitExemptionCertificate::where('user_id', $user->id)->findOrFail($id);

        // Delete file
        if ($certificate->certificate_file_path && Storage::disk('public')->exists($certificate->certificate_file_path)) {
            Storage::disk('public')->delete($certificate->certificate_file_path);
        }

        $certificate->delete();

        return back()->with('success', 'Exemption certificate deleted successfully.');
    }
}
