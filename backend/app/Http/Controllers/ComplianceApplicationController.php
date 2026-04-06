<?php

namespace App\Http\Controllers;

use App\Models\AdminSetting;
use App\Models\ComplianceApplication;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Laravel\Cashier\Cashier;

class ComplianceApplicationController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();
        $organization = $user->organization;

        if (!$organization) {
            abort(404);
        }

        $applicationFee = (float) AdminSetting::get('compliance_application_fee', 399.00);

        $latestApplication = $organization->complianceApplications()
            ->latest()
            ->first();

        $history = $organization->complianceApplications()
            ->latest()
            ->limit(10)
            ->get()
            ->map(function (ComplianceApplication $application) {
                return [
                    'id' => $application->id,
                    'application_number' => $application->application_number,
                    'status' => $application->status,
                    'payment_status' => $application->payment_status,
                    'assistance_types' => $application->assistance_types,
                    'amount' => $application->amount,
                    'submitted_at' => optional($application->submitted_at)->toIso8601String(),
                    'reviewed_at' => optional($application->reviewed_at)->toIso8601String(),
                ];
            });

        $activeApplication = $organization->complianceApplications()
            ->whereIn('status', ['pending_payment', 'awaiting_review', 'needs_more_info'])
            ->latest()
            ->first();

        return Inertia::render('compliance/Apply', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'tax_compliance_status' => $organization->tax_compliance_status,
                'tax_compliance_meta' => $organization->tax_compliance_meta,
                'is_compliance_locked' => (bool) $organization->is_compliance_locked,
                'registration_status' => $organization->registration_status,
            ],
            'applicationFee' => $applicationFee,
            'existingApplication' => $latestApplication ? [
                'id' => $latestApplication->id,
                'application_number' => $latestApplication->application_number,
                'status' => $latestApplication->status,
                'payment_status' => $latestApplication->payment_status,
                'submitted_at' => optional($latestApplication->submitted_at)->toIso8601String(),
                'amount' => $latestApplication->amount,
                'assistance_types' => $latestApplication->assistance_types,
                'description' => $latestApplication->description,
                'documents' => collect($latestApplication->documents)->map(fn ($doc) => [
                    'name' => $doc['name'] ?? basename($doc['path'] ?? ''),
                    'url' => isset($doc['path']) ? Storage::disk('public')->url($doc['path']) : null,
                ]),
            ] : null,
            'applicationHistory' => $history,
            'activeApplication' => $activeApplication ? [
                'id' => $activeApplication->id,
                'status' => $activeApplication->status,
                'payment_status' => $activeApplication->payment_status,
            ] : null,
            'contactDefaults' => [
                'name' => $organization->contact_name ?? $user->name,
                'email' => $organization->email ?? $user->email,
                'phone' => $organization->phone ?? $user->contact_number,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $organization = $user->organization;

        if (!$organization) {
            return redirect()->route('dashboard')->with('error', 'You are not eligible to submit a compliance application.');
        }

        $request->validate([
            'assistance_types' => ['required', 'array', 'min:1'],
            'assistance_types.*' => ['in:tax_exemption,form_990'],
            'description' => ['nullable', 'string', 'max:5000'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:50'],
            'documents' => ['nullable', 'array', 'max:5'],
            'documents.*' => ['file', 'mimes:pdf,jpg,jpeg,png,doc,docx', 'max:10240'],
        ]);

        $applicationFee = (float) AdminSetting::get('compliance_application_fee', 399.00);
        $amountInCents = (int) round($applicationFee * 100);

        $activeApplication = $organization->complianceApplications()
            ->whereIn('status', ['pending_payment', 'awaiting_review'])
            ->latest()
            ->first();

        if ($activeApplication) {
            return back()->withErrors([
                'message' => 'An application is already in progress. Please wait for review before submitting another.',
            ]);
        }

        $assistanceTypes = array_values($request->input('assistance_types', []));
        $description = $request->input('description');
        $contactName = $request->input('contact_name') ?? $organization->contact_name ?? $user->name;
        $contactEmail = $request->input('contact_email') ?? $organization->email ?? $user->email;
        $contactPhone = $request->input('contact_phone') ?? $organization->phone ?? $user->contact_number;

        $documents = [];
        if ($request->hasFile('documents')) {
            foreach ($request->file('documents') as $file) {
                $path = $file->store('compliance-applications', 'public');
                $documents[] = [
                    'path' => $path,
                    'name' => $file->getClientOriginalName(),
                    'mime' => $file->getClientMimeType(),
                ];
            }
        }

        try {
            $application = null;

            DB::transaction(function () use (
                $organization,
                $applicationFee,
                $assistanceTypes,
                $description,
                $documents,
                $contactName,
                $contactEmail,
                $contactPhone,
                &$application
            ) {
                $application = ComplianceApplication::create([
                    'organization_id' => $organization->id,
                    'application_number' => ComplianceApplication::generateApplicationNumber(),
                    'status' => 'pending_payment',
                    'amount' => $applicationFee,
                    'currency' => 'usd',
                    'payment_status' => 'pending',
                    'assistance_types' => $assistanceTypes,
                    'description' => $description,
                    'documents' => $documents,
                    'contact_name' => $contactName,
                    'contact_email' => $contactEmail,
                    'contact_phone' => $contactPhone,
                ]);
            });

            $checkout = $user->checkoutCharge(
                $amountInCents,
                '501(c)(3) compliance assistance application fee',
                1,
                [
                    'success_url' => route('compliance.apply.success', $application) . '?session_id={CHECKOUT_SESSION_ID}',
                    'cancel_url' => route('compliance.apply.cancel', $application),
                    'metadata' => [
                        'type' => 'compliance_application',
                        'application_id' => $application->id,
                        'application_number' => $application->application_number,
                        'organization_id' => $organization->id,
                        'user_id' => $user->id,
                        'assistance_types' => implode(',', $assistanceTypes),
                    ],
                    'payment_method_types' => ['card'],
                ]
            );

            $application->update([
                'stripe_session_id' => $checkout->id,
                'meta' => array_merge($application->meta ?? [], [
                    'checkout_url' => $checkout->url,
                ]),
            ]);

            return Inertia::location($checkout->url);
        } catch (\Exception $exception) {
            Log::error('Compliance application checkout error', [
                'error' => $exception->getMessage(),
                'organization_id' => $organization->id,
            ]);

            return back()->withErrors([
                'message' => 'Unable to create checkout session. Please try again later.',
            ]);
        }
    }

    public function success(Request $request, ComplianceApplication $application)
    {
        $user = $request->user();
        $organization = $user->organization;

        if ($application->organization_id !== optional($organization)->id) {
            abort(403);
        }

        $sessionId = $request->query('session_id');

        if (!$sessionId) {
            return redirect()->route('compliance.apply.show')->with('error', 'Missing checkout session identifier.');
        }

        if ($application->payment_status === 'paid') {
            return redirect()->route('compliance.apply.show')->with('success', 'Your application is already submitted and awaiting review.');
        }

        try {
            $session = Cashier::stripe()->checkout->sessions->retrieve($sessionId);

            if ($session->payment_status !== 'paid') {
                return redirect()->route('compliance.apply.show')->with('error', 'Payment was not completed.');
            }

            $application->update([
                'payment_status' => 'paid',
                'status' => 'awaiting_review',
                'stripe_payment_intent' => $session->payment_intent,
                'submitted_at' => now(),
                'meta' => array_merge($application->meta ?? [], [
                    'stripe_customer' => $session->customer,
                    'stripe_session_id' => $session->id,
                ]),
            ]);

            return redirect()->route('compliance.apply.show')->with('success', 'Payment received! Our team will review your application shortly.');
        } catch (\Exception $exception) {
            Log::error('Compliance application success handler error', [
                'error' => $exception->getMessage(),
                'application_id' => $application->id,
            ]);

            return redirect()->route('compliance.apply.show')->with('error', 'We could not verify the payment. Please contact support.');
        }
    }

    public function cancel(Request $request, ComplianceApplication $application)
    {
        $user = $request->user();
        $organization = $user->organization;

        if ($application->organization_id !== optional($organization)->id) {
            abort(403);
        }

        if ($application->payment_status === 'paid') {
            return redirect()->route('compliance.apply.show')->with('info', 'Payment was already processed.');
        }

        $application->update([
            'status' => 'cancelled',
            'payment_status' => 'cancelled',
        ]);

        return redirect()->route('compliance.apply.show')->with('info', 'Checkout cancelled. No charges were made.');
    }
}
