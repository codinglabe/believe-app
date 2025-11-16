<?php

namespace App\Http\Controllers;

use App\Models\AdminSetting;
use App\Models\Form1023Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Laravel\Cashier\Cashier;
use Spatie\Permission\Models\Role;

class Form1023ApplicationController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();
        
        // Only allow organization users, not admins
        if ($user->role === 'admin') {
            abort(403, 'Form 1023 is only available for organization users.');
        }
        
        $organization = $user->organization;

        if (!$organization) {
            abort(404, 'Organization not found.');
        }

        // Only allow if organization doesn't have EIN in database (has_edited_irs_data = true means EIN was not found)
        if (!$organization->has_edited_irs_data && $organization->registration_status === 'approved') {
            return redirect()->route('dashboard')->with('error', 'Form 1023 is only available for organizations not found in the IRS database.');
        }

        $applicationFee = (float) AdminSetting::get('form_1023_application_fee', 600.00);

        $latestApplication = $organization->form1023Applications()
            ->latest()
            ->first();

        $activeApplication = $organization->form1023Applications()
            ->whereIn('status', ['draft', 'pending_payment', 'awaiting_review', 'needs_more_info'])
            ->latest()
            ->first();

        // If there's an active application (not draft or needs_more_info), redirect to view page
        if ($activeApplication && !in_array($activeApplication->status, ['draft', 'needs_more_info'])) {
            return redirect()->route('form1023.apply.view', $activeApplication);
        }

        // Prepare existing application data for editing
        $existingApplicationData = null;
        if ($activeApplication && in_array($activeApplication->status, ['draft', 'needs_more_info'])) {
            $existingApplicationData = [
                'id' => $activeApplication->id,
                'application_number' => $activeApplication->application_number,
                'status' => $activeApplication->status,
                'payment_status' => $activeApplication->payment_status,
                'submitted_at' => optional($activeApplication->submitted_at)->toIso8601String(),
                'amount' => $activeApplication->amount,
                // Form data
                'legal_name' => $activeApplication->legal_name,
                'mailing_address' => $activeApplication->mailing_address,
                'physical_address' => $activeApplication->physical_address,
                'ein' => $activeApplication->ein,
                'date_incorporated' => $activeApplication->date_incorporated,
                'state_of_incorporation' => $activeApplication->state_of_incorporation,
                'organizational_structure' => $activeApplication->organizational_structure,
                'contact_phone' => $activeApplication->contact_phone,
                'contact_email' => $activeApplication->contact_email,
                'website' => $activeApplication->website,
                'mission_statement' => $activeApplication->mission_statement,
                'activities' => $activeApplication->activities,
                'revenue_sources' => $activeApplication->revenue_sources,
                'budget_per_program' => $activeApplication->budget_per_program,
                'officers_directors' => $activeApplication->officers_directors,
                'related_organizations' => $activeApplication->related_organizations,
                'political_activities_yes_no' => $activeApplication->political_activities_yes_no,
                'political_activities_desc' => $activeApplication->political_activities_desc,
                'foreign_activities_yes_no' => $activeApplication->foreign_activities_yes_no,
                'foreign_activities_desc' => $activeApplication->foreign_activities_desc,
                'compensation_arrangements' => $activeApplication->compensation_arrangements,
                'related_party_agreements' => $activeApplication->related_party_agreements,
                'grants' => $activeApplication->grants,
                'fundraising_activities' => $activeApplication->fundraising_activities,
                'major_contributors' => $activeApplication->major_contributors,
                // File data (already uploaded, just for reference)
                'organizing_documents' => $activeApplication->organizing_documents,
                'bylaws_document' => $activeApplication->bylaws_document,
                'conflict_of_interest_policy_document' => $activeApplication->conflict_of_interest_policy_document,
                'organizational_chart_document' => $activeApplication->organizational_chart_document,
                'financial_statements' => $activeApplication->financial_statements,
                'form_ss4_confirmation' => $activeApplication->form_ss4_confirmation,
                'board_meeting_minutes' => $activeApplication->board_meeting_minutes,
                'whistleblower_policy_document' => $activeApplication->whistleblower_policy_document,
                'fundraising_materials' => $activeApplication->fundraising_materials,
                'prior_year_tax_filings' => $activeApplication->prior_year_tax_filings,
                'rejected_documents' => $activeApplication->meta['rejected_documents'] ?? [],
            ];
        }

        return Inertia::render('form1023/Apply', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'ein' => $organization->ein,
                'street' => $organization->street,
                'city' => $organization->city,
                'state' => $organization->state,
                'zip' => $organization->zip,
                'website' => $organization->website,
                'email' => $organization->email,
                'phone' => $organization->phone,
                'contact_name' => $organization->contact_name,
                'contact_title' => $organization->contact_title,
                'mission' => $organization->mission,
                'description' => $organization->description,
            ],
            'applicationFee' => $applicationFee,
            'existingApplication' => $existingApplicationData,
            'activeApplication' => $activeApplication ? [
                'id' => $activeApplication->id,
                'status' => $activeApplication->status,
                'payment_status' => $activeApplication->payment_status,
            ] : null,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        
        // Only allow organization users, not admins
        if ($user->role === 'admin') {
            abort(403, 'Form 1023 is only available for organization users.');
        }
        
        $organization = $user->organization;

        if (!$organization) {
            return redirect()->route('dashboard')->with('error', 'You are not eligible to submit a Form 1023 application.');
        }

        // Only allow if organization doesn't have EIN in database (has_edited_irs_data = true means EIN was not found)
        if (!$organization->has_edited_irs_data && $organization->registration_status === 'approved') {
            return redirect()->route('dashboard')->with('error', 'Form 1023 is only available for organizations not found in the IRS database.');
        }

        $applicationFee = (float) AdminSetting::get('form_1023_application_fee', 600.00);
        $amountInCents = (int) round($applicationFee * 100);

        // Check for existing draft or needs_more_info application to update
        // Also check by application ID if provided in request
        $existingApplication = null;
        if ($request->has('application_id') || $request->has('_application_id')) {
            $appId = $request->input('application_id') ?: $request->input('_application_id');
            $existingApplication = $organization->form1023Applications()
                ->where('id', $appId)
                ->whereIn('status', ['draft', 'needs_more_info'])
                ->first();
        }
        
        // If not found by ID, get the latest draft/needs_more_info
        if (!$existingApplication) {
            $existingApplication = $organization->form1023Applications()
                ->whereIn('status', ['draft', 'needs_more_info'])
                ->latest()
                ->first();
        }

        $activeApplication = $organization->form1023Applications()
            ->whereIn('status', ['pending_payment', 'awaiting_review'])
            ->latest()
            ->first();

        if ($activeApplication && !$existingApplication) {
            return back()->withErrors([
                'message' => 'A Form 1023 application is already in progress. Please wait for review before submitting another.',
            ]);
        }

        // For editing: files are optional if they already exist in database
        // But if files are provided, they must be valid
        // Check if files exist in existing application (files are stored as JSON arrays)
        $hasOrganizingDocs = false;
        $hasBylaws = false;
        $hasConflictPolicy = false;
        $hasFinancialStatements = false;
        $hasSs4 = false;

        if ($existingApplication) {
            // Refresh to ensure we have latest data
            $existingApplication->refresh();
            
            $hasOrganizingDocs = !empty($existingApplication->organizing_documents) && 
                is_array($existingApplication->organizing_documents) && 
                count(array_filter($existingApplication->organizing_documents)) > 0;
            
            $hasBylaws = !empty($existingApplication->bylaws_document) && 
                is_array($existingApplication->bylaws_document) && 
                count(array_filter($existingApplication->bylaws_document)) > 0;
            
            $hasConflictPolicy = !empty($existingApplication->conflict_of_interest_policy_document) && 
                is_array($existingApplication->conflict_of_interest_policy_document) && 
                count(array_filter($existingApplication->conflict_of_interest_policy_document)) > 0;
            
            $hasFinancialStatements = !empty($existingApplication->financial_statements) && 
                is_array($existingApplication->financial_statements) && 
                count(array_filter($existingApplication->financial_statements)) > 0;
            
            $hasSs4 = !empty($existingApplication->form_ss4_confirmation) && 
                is_array($existingApplication->form_ss4_confirmation) && 
                count(array_filter($existingApplication->form_ss4_confirmation)) > 0;
        }

        // Set validation rules: if files exist in DB, make them nullable (optional)
        // If files don't exist, make them required
        // Note: 'nullable' allows the field to be absent from the request
        $organizingDocsRule = $hasOrganizingDocs ? ['nullable', 'sometimes', 'array', 'max:10'] : ['required', 'array', 'min:1', 'max:10'];
        $bylawsRule = $hasBylaws ? ['nullable', 'sometimes', 'array', 'max:10'] : ['required', 'array', 'min:1', 'max:10'];
        $conflictPolicyRule = $hasConflictPolicy ? ['nullable', 'sometimes', 'file', 'mimes:pdf', 'max:10240'] : ['required', 'file', 'mimes:pdf', 'max:10240'];
        $financialStatementsRule = $hasFinancialStatements ? ['nullable', 'sometimes', 'array', 'max:10'] : ['required', 'array', 'min:1', 'max:10'];
        $ss4Rule = $hasSs4 ? ['nullable', 'sometimes', 'file', 'mimes:pdf', 'max:10240'] : ['required', 'file', 'mimes:pdf', 'max:10240'];
        $fileSingleRuleWithImages = ['nullable', 'sometimes', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'];

        // Comprehensive validation based on IRS Form 1023 checklist
        $request->validate([
            // A. Basic Organization Information - REQUIRED
            'legal_name' => ['required', 'string', 'max:255'],
            'ein' => ['required', 'string', 'size:9', 'regex:/^[0-9]{9}$/'],
            'mailing_address' => ['required', 'string', 'max:1000'],
            'physical_address' => ['nullable', 'string', 'max:1000'],
            'date_incorporated' => ['required', 'date', 'before_or_equal:today'],
            'state_of_incorporation' => ['required', 'string', 'max:100'],
            'organizational_structure' => ['required', 'string', 'in:corporation,trust,association,other'],
            'contact_phone' => ['required', 'string', 'max:50'],
            'contact_email' => ['required', 'email', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
            // B. Organizational Structure & Governance - REQUIRED
            'organizing_documents' => $organizingDocsRule,
            'organizing_documents.*' => ['required_with:organizing_documents', 'file', 'mimes:pdf', 'max:10240'],
            'bylaws_document' => $bylawsRule,
            'bylaws_document.*' => ['required_with:bylaws_document', 'file', 'mimes:pdf', 'max:10240'],
            'officers_directors' => ['required', 'array', 'min:1'],
            'officers_directors.*.name' => ['required', 'string', 'max:255'],
            'officers_directors.*.title' => ['required', 'string', 'max:255'],
            'officers_directors.*.address' => ['nullable', 'string', 'max:500'],
            'officers_directors.*.compensation' => ['nullable', 'numeric', 'min:0'],
            'officers_directors.*.hours_per_week' => ['nullable', 'numeric', 'min:0', 'max:168'],
            'conflict_of_interest_policy_document' => $conflictPolicyRule,
            'organizational_chart_document' => $fileSingleRuleWithImages,
            'related_organizations' => ['nullable', 'array'],
            // C. Purpose & Activities - REQUIRED
            'mission_statement' => ['required', 'string', 'min:10', 'max:5000'],
            'activities' => ['required', 'array', 'min:1'],
            'activities.*.activity_name' => ['required', 'string', 'max:255'],
            'activities.*.description' => ['required', 'string', 'min:20', 'max:5000'],
            'activities.*.beneficiaries' => ['required', 'string', 'min:10', 'max:2000'],
            'activities.*.funding_source' => ['required', 'string', 'min:20', 'max:2000'],
            'fundraising_materials' => ['nullable', 'array', 'max:10'],
            'fundraising_materials.*' => ['file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            // D. Financial Information - REQUIRED
            'financial_statements' => $financialStatementsRule,
            'financial_statements.*' => ['required_with:financial_statements', 'file', 'mimes:pdf', 'max:10240'],
            'revenue_sources' => ['required', 'array', 'min:1'],
            'revenue_sources.*.source' => ['required', 'string', 'max:255'],
            'revenue_sources.*.amount' => ['required', 'numeric', 'min:0'],
            'budget_per_program' => ['required', 'array', 'min:1'],
            'budget_per_program.*.program' => ['required', 'string', 'max:255'],
            'budget_per_program.*.amount' => ['required', 'numeric', 'min:0'],
            'major_contributors' => ['nullable', 'array'],
            'major_contributors.*.name' => ['required_with:major_contributors', 'string', 'max:255'],
            'major_contributors.*.amount' => ['required_with:major_contributors', 'numeric', 'min:5000'],
            'major_contributors.*.frequency' => ['nullable', 'string', 'in:one-time,monthly,quarterly,annually'],
            'fundraising_activities' => ['nullable', 'array'],
            'prior_year_tax_filings' => ['nullable', 'array', 'max:10'],
            'prior_year_tax_filings.*' => ['file', 'mimes:pdf', 'max:10240'],
            // E. Operational Details - OPTIONAL
            'compensation_arrangements' => ['nullable', 'array'],
            'related_party_agreements' => ['nullable', 'array'],
            'political_activities_yes_no' => ['nullable', 'string', 'in:Yes,No'],
            'political_activities_desc' => ['nullable', 'string', 'max:2000'],
            'grants' => ['nullable', 'array'],
            'foreign_activities_yes_no' => ['nullable', 'string', 'in:Yes,No'],
            'foreign_activities_desc' => ['nullable', 'string', 'max:2000'],
            // F. Supporting Documents - REQUIRED
            'form_ss4_confirmation' => $ss4Rule,
            'board_meeting_minutes' => ['nullable', 'file', 'mimes:pdf', 'max:10240'],
            'whistleblower_policy_document' => ['nullable', 'file', 'mimes:pdf', 'max:10240'],
        ], [
            // Custom error messages
            'legal_name.required' => 'Legal name is required.',
            'ein.required' => 'EIN is required.',
            'ein.size' => 'EIN must be exactly 9 digits.',
            'ein.regex' => 'EIN must contain only numbers.',
            'mailing_address.required' => 'Mailing address is required.',
            'date_incorporated.required' => 'Date of incorporation is required.',
            'date_incorporated.before_or_equal' => 'Date of incorporation cannot be in the future.',
            'state_of_incorporation.required' => 'State of incorporation is required.',
            'organizational_structure.required' => 'Organizational structure type is required.',
            'contact_phone.required' => 'Contact phone number is required.',
            'contact_email.required' => 'Contact email is required.',
            'organizing_documents.required' => 'Articles of Incorporation documents are required.',
            'organizing_documents.min' => 'At least one organizing document must be uploaded.',
            'bylaws_document.required' => 'Bylaws document is required.',
            'bylaws_document.min' => 'At least one bylaws document must be uploaded.',
            'officers_directors.required' => 'At least one officer or director must be listed.',
            'officers_directors.min' => 'At least one officer or director must be listed.',
            'officers_directors.*.name.required' => 'Officer/Director name is required.',
            'officers_directors.*.title.required' => 'Officer/Director title is required.',
            'mission_statement.required' => 'Mission statement is required.',
            'mission_statement.min' => 'Mission statement must be at least 10 characters.',
            'activities.required' => 'At least one activity is required.',
            'activities.*.activity_name.required' => 'Activity name is required.',
            'activities.*.description.required' => 'Activity description is required.',
            'activities.*.description.min' => 'Activity description must be at least 20 characters.',
            'activities.*.beneficiaries.required' => 'Beneficiaries description is required.',
            'activities.*.beneficiaries.min' => 'Beneficiaries description must be at least 10 characters.',
            'activities.*.funding_source.required' => 'Funding source description is required.',
            'activities.*.funding_source.min' => 'Funding source description must be at least 20 characters.',
            'financial_statements.required' => 'Current year financial statements are required.',
            'financial_statements.min' => 'At least one financial statement must be uploaded.',
            'revenue_sources.required' => 'At least one revenue source must be listed.',
            'revenue_sources.min' => 'At least one revenue source must be listed.',
            'revenue_sources.*.source.required' => 'Revenue source type is required.',
            'revenue_sources.*.amount.required' => 'Revenue source amount is required.',
            'budget_per_program.required' => 'At least one program budget must be listed.',
            'budget_per_program.min' => 'At least one program budget must be listed.',
            'budget_per_program.*.program.required' => 'Program name is required.',
            'budget_per_program.*.amount.required' => 'Program budget amount is required.',
            'major_contributors.*.amount.min' => 'Major contributors must donate more than $5,000 annually.',
            'form_ss4_confirmation.required' => 'IRS Form SS-4 confirmation letter is required.',
            'conflict_of_interest_policy_document.required' => 'Conflict of Interest Policy document is required.',
        ]);

        try {
            $application = null;

            DB::transaction(function () use ($request, $organization, $applicationFee, $existingApplication, $user, &$application) {
                // Helper function to handle multiple file uploads
                $handleFileUploads = function ($files, $directory, $existingFiles = null, $fieldName = null, &$meta = null) {
                    $uploaded = [];
                    if ($files) {
                        $fileArray = is_array($files) ? $files : [$files];
                        
                        // Clear rejection status for this field if new files are uploaded
                        if ($fieldName && $meta) {
                            $rejectedDocs = $meta['rejected_documents'] ?? [];
                            // Remove rejection for this field
                            if (isset($rejectedDocs[$fieldName])) {
                                unset($rejectedDocs[$fieldName]);
                            }
                            // Remove rejections for indexed files
                            foreach ($rejectedDocs as $key => $value) {
                                if (strpos($key, $fieldName . '[') === 0) {
                                    unset($rejectedDocs[$key]);
                                }
                            }
                            $meta['rejected_documents'] = $rejectedDocs;
                        }
                        foreach ($fileArray as $file) {
                            if ($file instanceof \Illuminate\Http\UploadedFile) {
                                $path = $file->store($directory, 'public');
                                $uploaded[] = [
                                    'path' => $path,
                                    'name' => $file->getClientOriginalName(),
                                    'mime' => $file->getClientMimeType(),
                                    'size' => $file->getSize(),
                                ];
                            }
                        }
                    }
                    // Keep existing files if no new files uploaded
                    if (empty($uploaded) && $existingFiles) {
                        return $existingFiles;
                    }
                    return $uploaded;
                };

                // Helper function to handle single file upload
                $handleSingleFileUpload = function ($file, $directory, $existingFile = null) {
                    if ($file && $file instanceof \Illuminate\Http\UploadedFile) {
                        $path = $file->store($directory, 'public');
                        return [
                            'path' => $path,
                            'name' => $file->getClientOriginalName(),
                            'mime' => $file->getClientMimeType(),
                            'size' => $file->getSize(),
                        ];
                    }
                    // Return existing file if no new file uploaded
                    return $existingFile;
                };

                // Handle all file uploads - Multiple files (keep existing if no new files)
                $organizingDocuments = $handleFileUploads(
                    $request->file('organizing_documents'),
                    'form1023/organizing-documents',
                    $existingApplication?->organizing_documents
                );
                $bylawsDocuments = $handleFileUploads(
                    $request->file('bylaws_document'),
                    'form1023/bylaws',
                    $existingApplication?->bylaws_document
                );
                $fundraisingMaterials = $handleFileUploads(
                    $request->file('fundraising_materials'),
                    'form1023/fundraising-materials',
                    $existingApplication?->fundraising_materials
                );
                $financialStatements = $handleFileUploads(
                    $request->file('financial_statements'),
                    'form1023/financial-statements',
                    $existingApplication?->financial_statements
                );
                $priorYearTaxFilings = $handleFileUploads(
                    $request->file('prior_year_tax_filings'),
                    'form1023/prior-year-tax',
                    $existingApplication?->prior_year_tax_filings
                );
                
                // Handle single file uploads (keep existing if no new file)
                $conflictPolicyDocument = $handleSingleFileUpload(
                    $request->file('conflict_of_interest_policy_document'),
                    'form1023/conflict-policy',
                    $existingApplication?->conflict_of_interest_policy_document?->first()
                );
                $orgChartDocument = $handleSingleFileUpload(
                    $request->file('organizational_chart_document'),
                    'form1023/organizational-chart',
                    $existingApplication?->organizational_chart_document?->first()
                );
                $ss4Confirmation = $handleSingleFileUpload(
                    $request->file('form_ss4_confirmation'),
                    'form1023/ss4-confirmation',
                    $existingApplication?->form_ss4_confirmation?->first()
                );
                $boardMinutes = $handleSingleFileUpload(
                    $request->file('board_meeting_minutes'),
                    'form1023/board-minutes',
                    $existingApplication?->board_meeting_minutes?->first()
                );
                $whistleblowerPolicy = $handleSingleFileUpload(
                    $request->file('whistleblower_policy_document'),
                    'form1023/whistleblower-policy',
                    $existingApplication?->whistleblower_policy_document?->first()
                );

                // Handle file uploads in repeater fields
                $fundraisingActivities = $request->input('fundraising_activities', []);
                if (is_array($fundraisingActivities)) {
                    foreach ($fundraisingActivities as &$activity) {
                        if (isset($activity['contract']) && $activity['contract'] instanceof \Illuminate\Http\UploadedFile) {
                            $contractFile = $handleSingleFileUpload($activity['contract'], 'form1023/fundraising-contracts');
                            $activity['contract'] = $contractFile;
                        }
                    }
                }

                $relatedPartyAgreements = $request->input('related_party_agreements', []);
                if (is_array($relatedPartyAgreements)) {
                    foreach ($relatedPartyAgreements as &$agreement) {
                        if (isset($agreement['document']) && $agreement['document'] instanceof \Illuminate\Http\UploadedFile) {
                            $docFile = $handleSingleFileUpload($agreement['document'], 'form1023/related-party-agreements');
                            $agreement['document'] = $docFile;
                        }
                    }
                }

                // Update existing application or create new one
                if ($existingApplication) {
                    $application = $existingApplication;
                    $application->update([
                        'status' => 'pending_payment',
                        'amount' => $applicationFee,
                        'payment_status' => 'pending',
                        // A. Basic Organization Information
                        'legal_name' => $request->input('legal_name'),
                        'mailing_address' => $request->input('mailing_address'),
                        'physical_address' => $request->input('physical_address'),
                        'ein' => $request->input('ein'),
                        'date_incorporated' => $request->input('date_incorporated'),
                        'state_of_incorporation' => $request->input('state_of_incorporation'),
                        'organizational_structure' => $request->input('organizational_structure'),
                        'contact_phone' => $request->input('contact_phone'),
                        'contact_email' => $request->input('contact_email'),
                        'website' => $request->input('website'),
                        // B. Organizational Structure & Governance
                        'organizing_documents' => $organizingDocuments,
                        'bylaws_document' => $bylawsDocuments,
                        'officers_directors' => $request->input('officers_directors', []),
                        'conflict_of_interest_policy_document' => $conflictPolicyDocument ? [$conflictPolicyDocument] : null,
                        'organizational_chart_document' => $orgChartDocument ? [$orgChartDocument] : null,
                        'related_organizations' => $request->input('related_organizations', []),
                        // C. Purpose & Activities
                        'mission_statement' => $request->input('mission_statement'),
                        'activities' => $request->input('activities', []),
                        'fundraising_materials' => $fundraisingMaterials,
                        // D. Financial Information
                        'financial_statements' => $financialStatements,
                        'revenue_sources' => $request->input('revenue_sources', []),
                        'budget_per_program' => $request->input('budget_per_program', []),
                        'major_contributors' => $request->input('major_contributors', []),
                        'fundraising_activities' => $fundraisingActivities,
                        'prior_year_tax_filings' => $priorYearTaxFilings,
                        // E. Operational Details
                        'compensation_arrangements' => $request->input('compensation_arrangements', []),
                        'related_party_agreements' => $relatedPartyAgreements,
                        'political_activities_yes_no' => $request->input('political_activities_yes_no'),
                        'political_activities_desc' => $request->input('political_activities_desc'),
                        'grants' => $request->input('grants', []),
                        'foreign_activities_yes_no' => $request->input('foreign_activities_yes_no'),
                        'foreign_activities_desc' => $request->input('foreign_activities_desc'),
                        // F. Supporting Documents
                        'form_ss4_confirmation' => $ss4Confirmation ? [$ss4Confirmation] : null,
                        'board_meeting_minutes' => $boardMinutes ? [$boardMinutes] : null,
                        'whistleblower_policy_document' => $whistleblowerPolicy ? [$whistleblowerPolicy] : null,
                    ]);
                } else {
                    $application = Form1023Application::create([
                        'organization_id' => $organization->id,
                        'application_number' => Form1023Application::generateApplicationNumber(),
                        'status' => 'pending_payment',
                        'amount' => $applicationFee,
                        'currency' => 'usd',
                        'payment_status' => 'pending',
                        // A. Basic Organization Information
                        'legal_name' => $request->input('legal_name'),
                        'mailing_address' => $request->input('mailing_address'),
                        'physical_address' => $request->input('physical_address'),
                        'ein' => $request->input('ein'),
                        'date_incorporated' => $request->input('date_incorporated'),
                        'state_of_incorporation' => $request->input('state_of_incorporation'),
                        'organizational_structure' => $request->input('organizational_structure'),
                        'contact_phone' => $request->input('contact_phone'),
                        'contact_email' => $request->input('contact_email'),
                        'website' => $request->input('website'),
                        // B. Organizational Structure & Governance
                        'organizing_documents' => $organizingDocuments,
                        'bylaws_document' => $bylawsDocuments,
                        'officers_directors' => $request->input('officers_directors', []),
                        'conflict_of_interest_policy_document' => $conflictPolicyDocument ? [$conflictPolicyDocument] : null,
                        'organizational_chart_document' => $orgChartDocument ? [$orgChartDocument] : null,
                        'related_organizations' => $request->input('related_organizations', []),
                        // C. Purpose & Activities
                        'mission_statement' => $request->input('mission_statement'),
                        'activities' => $request->input('activities', []),
                        'fundraising_materials' => $fundraisingMaterials,
                        // D. Financial Information
                        'financial_statements' => $financialStatements,
                        'revenue_sources' => $request->input('revenue_sources', []),
                        'budget_per_program' => $request->input('budget_per_program', []),
                        'major_contributors' => $request->input('major_contributors', []),
                        'fundraising_activities' => $fundraisingActivities,
                        'prior_year_tax_filings' => $priorYearTaxFilings,
                        // E. Operational Details
                        'compensation_arrangements' => $request->input('compensation_arrangements', []),
                        'related_party_agreements' => $relatedPartyAgreements,
                        'political_activities_yes_no' => $request->input('political_activities_yes_no'),
                        'political_activities_desc' => $request->input('political_activities_desc'),
                        'grants' => $request->input('grants', []),
                        'foreign_activities_yes_no' => $request->input('foreign_activities_yes_no'),
                        'foreign_activities_desc' => $request->input('foreign_activities_desc'),
                        // F. Supporting Documents
                        'form_ss4_confirmation' => $ss4Confirmation ? [$ss4Confirmation] : null,
                        'board_meeting_minutes' => $boardMinutes ? [$boardMinutes] : null,
                        'whistleblower_policy_document' => $whistleblowerPolicy ? [$whistleblowerPolicy] : null,
                    ]);
                }
            });

            $checkout = $user->checkoutCharge(
                $amountInCents,
                'Form 1023 - Application for Recognition of Exemption',
                1,
                [
                    'success_url' => route('form1023.apply.success', $application) . '?session_id={CHECKOUT_SESSION_ID}',
                    'cancel_url' => route('form1023.apply.cancel', $application),
                    'metadata' => [
                        'type' => 'form_1023_application',
                        'application_id' => $application->id,
                        'application_number' => $application->application_number,
                        'organization_id' => $organization->id,
                        'user_id' => $user->id,
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

            // Set organization status to inactive
            $organization->status = 'Inactive';
            $organization->save();
            
            // Assign organization role and remove organization_pending role
            // This will also set registration_status to 'approved'
            $this->assignOrganizationRole($user);

            return Inertia::location($checkout->url);
        } catch (\Exception $exception) {
            Log::error('Form 1023 application checkout error', [
                'error' => $exception->getMessage(),
                'organization_id' => $organization->id,
            ]);

            return back()->withErrors([
                'message' => 'Unable to create checkout session. Please try again later.',
            ]);
        }
    }

    public function success(Request $request, Form1023Application $application)
    {
        $user = $request->user();
        
        // Only allow organization users, not admins
        if ($user->role === 'admin') {
            abort(403, 'Form 1023 is only available for organization users.');
        }
        
        $organization = $user->organization;

        if ($application->organization_id !== optional($organization)->id) {
            abort(403);
        }

        $sessionId = $request->query('session_id');

        if (!$sessionId) {
            return redirect()->route('form1023.apply.show')->with('error', 'Missing checkout session identifier.');
        }

        if ($application->payment_status === 'paid') {
            return redirect()->route('form1023.apply.show')->with('success', 'Your Form 1023 application is already submitted and awaiting review.');
        }

        try {
            $session = Cashier::stripe()->checkout->sessions->retrieve($sessionId);

            if ($session->payment_status !== 'paid') {
                return redirect()->route('form1023.apply.show')->with('error', 'Payment was not completed.');
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

            // Ensure organization role is assigned (should already be assigned from store method)
            $this->assignOrganizationRole($user);

            return redirect()->route('form1023.apply.view', $application)->with('success', 'Payment received! Your Form 1023 application has been submitted and is awaiting review.');
        } catch (\Exception $exception) {
            Log::error('Form 1023 application success handler error', [
                'error' => $exception->getMessage(),
                'application_id' => $application->id,
            ]);

            return redirect()->route('form1023.apply.show')->with('error', 'We could not verify the payment. Please contact support.');
        }
    }

    public function view(Request $request, Form1023Application $application)
    {
        $user = $request->user();
        
        // Only allow organization users, not admins
        if ($user->role === 'admin') {
            abort(403, 'Form 1023 is only available for organization users.');
        }
        
        $organization = $user->organization;

        if ($application->organization_id !== optional($organization)->id) {
            abort(403);
        }

        $applicationFee = (float) AdminSetting::get('form_1023_application_fee', 600.00);

        return Inertia::render('form1023/View', [
            'application' => [
                'id' => $application->id,
                'application_number' => $application->application_number,
                'status' => $application->status,
                'payment_status' => $application->payment_status,
                'submitted_at' => optional($application->submitted_at)->toIso8601String(),
                'amount' => $application->amount,
                'legal_name' => $application->legal_name,
                'ein' => $application->ein,
                'mailing_address' => $application->mailing_address,
                'physical_address' => $application->physical_address,
                'date_incorporated' => $application->date_incorporated,
                'state_of_incorporation' => $application->state_of_incorporation,
                'organizational_structure' => $application->organizational_structure,
                'contact_phone' => $application->contact_phone,
                'contact_email' => $application->contact_email,
                'website' => $application->website,
                'mission_statement' => $application->mission_statement,
                'activities' => $application->activities,
                'revenue_sources' => $application->revenue_sources,
                'budget_per_program' => $application->budget_per_program,
                'officers_directors' => $application->officers_directors,
                'organizing_documents' => $application->organizing_documents,
                'bylaws_document' => $application->bylaws_document,
                'conflict_of_interest_policy_document' => $application->conflict_of_interest_policy_document,
                'financial_statements' => $application->financial_statements,
                'form_ss4_confirmation' => $application->form_ss4_confirmation,
                'political_activities_yes_no' => $application->political_activities_yes_no,
                'political_activities_desc' => $application->political_activities_desc,
                'foreign_activities_yes_no' => $application->foreign_activities_yes_no,
                'foreign_activities_desc' => $application->foreign_activities_desc,
            ],
            'applicationFee' => $applicationFee,
            'canEdit' => in_array($application->status, ['draft', 'needs_more_info']),
            'canPay' => $application->payment_status === 'pending' && in_array($application->status, ['pending_payment', 'draft']),
        ]);
    }

    public function initiatePayment(Request $request, Form1023Application $application)
    {
        $user = $request->user();
        
        // Only allow organization users, not admins
        if ($user->role === 'admin') {
            abort(403, 'Form 1023 is only available for organization users.');
        }
        
        $organization = $user->organization;

        if ($application->organization_id !== optional($organization)->id) {
            abort(403);
        }

        // Check if payment is already completed
        if ($application->payment_status === 'paid') {
            return redirect()->route('form1023.apply.view', $application)->with('info', 'Payment has already been processed.');
        }

        // Check if application is in a state that allows payment
        if (!in_array($application->status, ['pending_payment', 'draft'])) {
            return redirect()->route('form1023.apply.view', $application)->with('error', 'Payment cannot be initiated for this application status.');
        }

        $applicationFee = (float) AdminSetting::get('form_1023_application_fee', 600.00);
        $amountInCents = (int) round($applicationFee * 100);

        try {
            $checkout = $user->checkoutCharge(
                $amountInCents,
                'Form 1023 - Application for Recognition of Exemption',
                1,
                [
                    'success_url' => route('form1023.apply.success', $application) . '?session_id={CHECKOUT_SESSION_ID}',
                    'cancel_url' => route('form1023.apply.cancel', $application),
                    'metadata' => [
                        'type' => 'form_1023_application',
                        'application_id' => $application->id,
                        'application_number' => $application->application_number,
                        'organization_id' => $organization->id,
                        'user_id' => $user->id,
                    ],
                    'payment_method_types' => ['card'],
                ]
            );

            $application->update([
                'stripe_session_id' => $checkout->id,
                'status' => 'pending_payment',
                'payment_status' => 'pending',
                'meta' => array_merge($application->meta ?? [], [
                    'checkout_url' => $checkout->url,
                ]),
            ]);

            return Inertia::location($checkout->url);
        } catch (\Exception $exception) {
            Log::error('Form 1023 application payment initiation error', [
                'error' => $exception->getMessage(),
                'organization_id' => $organization->id,
                'application_id' => $application->id,
            ]);

            return redirect()->route('form1023.apply.view', $application)->withErrors([
                'message' => 'Unable to initiate payment. Please try again later.',
            ]);
        }
    }

    public function cancel(Request $request, Form1023Application $application)
    {
        $user = $request->user();
        
        // Only allow organization users, not admins
        if ($user->role === 'admin') {
            abort(403, 'Form 1023 is only available for organization users.');
        }
        
        $organization = $user->organization;

        if ($application->organization_id !== optional($organization)->id) {
            abort(403);
        }

        if ($application->payment_status === 'paid') {
            return redirect()->route('form1023.apply.show')->with('info', 'Payment was already processed.');
        }

        $application->update([
            'status' => 'cancelled',
            'payment_status' => 'cancelled',
        ]);

        return redirect()->route('form1023.apply.show')->with('info', 'Checkout cancelled. No charges were made.');
    }

    public function update(Request $request, Form1023Application $application)
    {
        $user = $request->user();
        
        // Only allow organization users, not admins
        if ($user->role === 'admin') {
            abort(403, 'Form 1023 is only available for organization users.');
        }
        
        $organization = $user->organization;

        if (!$organization || $application->organization_id !== $organization->id) {
            abort(403);
        }

        // Only allow updating draft or needs_more_info applications
        if (!in_array($application->status, ['draft', 'needs_more_info'])) {
            return redirect()->route('form1023.apply.view', $application)
                ->with('error', 'This application cannot be edited.');
        }

        // For editing: ALL files are optional (they already exist in database)
        $request->validate([
            // A. Basic Organization Information - REQUIRED
            'legal_name' => ['required', 'string', 'max:255'],
            'ein' => ['required', 'string', 'size:9', 'regex:/^[0-9]{9}$/'],
            'mailing_address' => ['required', 'string', 'max:1000'],
            'physical_address' => ['nullable', 'string', 'max:1000'],
            'date_incorporated' => ['required', 'date', 'before_or_equal:today'],
            'state_of_incorporation' => ['required', 'string', 'max:100'],
            'organizational_structure' => ['required', 'string', 'in:corporation,trust,association,other'],
            'contact_phone' => ['required', 'string', 'max:50'],
            'contact_email' => ['required', 'email', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
            // B. Organizational Structure & Governance - FILES ARE OPTIONAL WHEN EDITING
            'organizing_documents' => ['nullable', 'array', 'max:10'],
            'organizing_documents.*' => ['file', 'mimes:pdf', 'max:10240'],
            'bylaws_document' => ['nullable', 'array', 'max:10'],
            'bylaws_document.*' => ['file', 'mimes:pdf', 'max:10240'],
            'officers_directors' => ['required', 'array', 'min:1'],
            'officers_directors.*.name' => ['required', 'string', 'max:255'],
            'officers_directors.*.title' => ['required', 'string', 'max:255'],
            'officers_directors.*.address' => ['nullable', 'string', 'max:500'],
            'officers_directors.*.compensation' => ['nullable', 'numeric', 'min:0'],
            'officers_directors.*.hours_per_week' => ['nullable', 'numeric', 'min:0', 'max:168'],
            'conflict_of_interest_policy_document' => ['nullable', 'file', 'mimes:pdf', 'max:10240'],
            'organizational_chart_document' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'related_organizations' => ['nullable', 'array'],
            // C. Purpose & Activities - REQUIRED
            'mission_statement' => ['required', 'string', 'min:10', 'max:5000'],
            'activities' => ['required', 'array', 'min:1'],
            'activities.*.activity_name' => ['required', 'string', 'max:255'],
            'activities.*.description' => ['required', 'string', 'min:20', 'max:5000'],
            'activities.*.beneficiaries' => ['required', 'string', 'min:10', 'max:2000'],
            'activities.*.funding_source' => ['required', 'string', 'min:20', 'max:2000'],
            'fundraising_materials' => ['nullable', 'array', 'max:10'],
            'fundraising_materials.*' => ['file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            // D. Financial Information - FILES ARE OPTIONAL WHEN EDITING
            'financial_statements' => ['nullable', 'array', 'max:10'],
            'financial_statements.*' => ['file', 'mimes:pdf', 'max:10240'],
            'revenue_sources' => ['required', 'array', 'min:1'],
            'revenue_sources.*.source' => ['required', 'string', 'max:255'],
            'revenue_sources.*.amount' => ['required', 'numeric', 'min:0'],
            'budget_per_program' => ['required', 'array', 'min:1'],
            'budget_per_program.*.program' => ['required', 'string', 'max:255'],
            'budget_per_program.*.amount' => ['required', 'numeric', 'min:0'],
            'major_contributors' => ['nullable', 'array'],
            'major_contributors.*.name' => ['required_with:major_contributors', 'string', 'max:255'],
            'major_contributors.*.amount' => ['required_with:major_contributors', 'numeric', 'min:5000'],
            'major_contributors.*.frequency' => ['nullable', 'string', 'in:one-time,monthly,quarterly,annually'],
            'fundraising_activities' => ['nullable', 'array'],
            'prior_year_tax_filings' => ['nullable', 'array', 'max:10'],
            'prior_year_tax_filings.*' => ['file', 'mimes:pdf', 'max:10240'],
            // E. Operational Details - OPTIONAL
            'compensation_arrangements' => ['nullable', 'array'],
            'related_party_agreements' => ['nullable', 'array'],
            'political_activities_yes_no' => ['nullable', 'string', 'in:Yes,No'],
            'political_activities_desc' => ['nullable', 'string', 'max:2000'],
            'grants' => ['nullable', 'array'],
            'foreign_activities_yes_no' => ['nullable', 'string', 'in:Yes,No'],
            'foreign_activities_desc' => ['nullable', 'string', 'max:2000'],
            // F. Supporting Documents - FILES ARE OPTIONAL WHEN EDITING
            'form_ss4_confirmation' => ['nullable', 'file', 'mimes:pdf', 'max:10240'],
            'board_meeting_minutes' => ['nullable', 'file', 'mimes:pdf', 'max:10240'],
            'whistleblower_policy_document' => ['nullable', 'file', 'mimes:pdf', 'max:10240'],
        ]);

        $applicationFee = (float) AdminSetting::get('form_1023_application_fee', 600.00);
        $amountInCents = (int) round($applicationFee * 100);

        try {
            DB::transaction(function () use ($request, $organization, $applicationFee, $application, $user) {
                // Helper functions (same as store method)
                $handleFileUploads = function ($files, $directory, $existingFiles = null) {
                    $uploaded = [];
                    if ($files) {
                        $fileArray = is_array($files) ? $files : [$files];
                        foreach ($fileArray as $file) {
                            if ($file instanceof \Illuminate\Http\UploadedFile) {
                                $path = $file->store($directory, 'public');
                                $uploaded[] = [
                                    'path' => $path,
                                    'name' => $file->getClientOriginalName(),
                                    'mime' => $file->getClientMimeType(),
                                    'size' => $file->getSize(),
                                ];
                            }
                        }
                    }
                    if (empty($uploaded) && $existingFiles) {
                        return $existingFiles;
                    }
                    return $uploaded;
                };

                $handleSingleFileUpload = function ($file, $directory, $existingFile = null) {
                    if ($file && $file instanceof \Illuminate\Http\UploadedFile) {
                        $path = $file->store($directory, 'public');
                        return [
                            'path' => $path,
                            'name' => $file->getClientOriginalName(),
                            'mime' => $file->getClientMimeType(),
                            'size' => $file->getSize(),
                        ];
                    }
                    return $existingFile;
                };

                // Handle file uploads (keep existing if no new files)
                $organizingDocuments = $handleFileUploads(
                    $request->file('organizing_documents'),
                    'form1023/organizing-documents',
                    $application->organizing_documents
                );
                $bylawsDocuments = $handleFileUploads(
                    $request->file('bylaws_document'),
                    'form1023/bylaws',
                    $application->bylaws_document
                );
                $fundraisingMaterials = $handleFileUploads(
                    $request->file('fundraising_materials'),
                    'form1023/fundraising-materials',
                    $application->fundraising_materials
                );
                $financialStatements = $handleFileUploads(
                    $request->file('financial_statements'),
                    'form1023/financial-statements',
                    $application->financial_statements
                );
                $priorYearTaxFilings = $handleFileUploads(
                    $request->file('prior_year_tax_filings'),
                    'form1023/prior-year-tax',
                    $application->prior_year_tax_filings
                );
                
                $conflictPolicyDocument = $handleSingleFileUpload(
                    $request->file('conflict_of_interest_policy_document'),
                    'form1023/conflict-policy',
                    is_array($application->conflict_of_interest_policy_document) && count($application->conflict_of_interest_policy_document) > 0 
                        ? $application->conflict_of_interest_policy_document[0] 
                        : null
                );
                $orgChartDocument = $handleSingleFileUpload(
                    $request->file('organizational_chart_document'),
                    'form1023/organizational-chart',
                    is_array($application->organizational_chart_document) && count($application->organizational_chart_document) > 0 
                        ? $application->organizational_chart_document[0] 
                        : null
                );
                $ss4Confirmation = $handleSingleFileUpload(
                    $request->file('form_ss4_confirmation'),
                    'form1023/ss4-confirmation',
                    is_array($application->form_ss4_confirmation) && count($application->form_ss4_confirmation) > 0 
                        ? $application->form_ss4_confirmation[0] 
                        : null
                );
                $boardMinutes = $handleSingleFileUpload(
                    $request->file('board_meeting_minutes'),
                    'form1023/board-minutes',
                    is_array($application->board_meeting_minutes) && count($application->board_meeting_minutes) > 0 
                        ? $application->board_meeting_minutes[0] 
                        : null
                );
                $whistleblowerPolicy = $handleSingleFileUpload(
                    $request->file('whistleblower_policy_document'),
                    'form1023/whistleblower-policy',
                    is_array($application->whistleblower_policy_document) && count($application->whistleblower_policy_document) > 0 
                        ? $application->whistleblower_policy_document[0] 
                        : null
                );

                // Handle file uploads in repeater fields
                $fundraisingActivities = $request->input('fundraising_activities', []);
                if (is_array($fundraisingActivities)) {
                    foreach ($fundraisingActivities as &$activity) {
                        if (isset($activity['contract']) && $activity['contract'] instanceof \Illuminate\Http\UploadedFile) {
                            $contractFile = $handleSingleFileUpload($activity['contract'], 'form1023/fundraising-contracts');
                            $activity['contract'] = $contractFile;
                        }
                    }
                }

                $relatedPartyAgreements = $request->input('related_party_agreements', []);
                if (is_array($relatedPartyAgreements)) {
                    foreach ($relatedPartyAgreements as &$agreement) {
                        if (isset($agreement['document']) && $agreement['document'] instanceof \Illuminate\Http\UploadedFile) {
                            $docFile = $handleSingleFileUpload($agreement['document'], 'form1023/related-party-agreements');
                            $agreement['document'] = $docFile;
                        }
                    }
                }

                // Check if this is a draft save
                $isDraftSave = $request->has('save_as_draft') && $request->input('save_as_draft') == '1';
                
                // Update the application
                $application->update([
                    'status' => $isDraftSave ? 'draft' : 'pending_payment',
                    'amount' => $applicationFee,
                    'payment_status' => 'pending',
                    'legal_name' => $request->input('legal_name'),
                    'mailing_address' => $request->input('mailing_address'),
                    'physical_address' => $request->input('physical_address'),
                    'ein' => $request->input('ein'),
                    'date_incorporated' => $request->input('date_incorporated'),
                    'state_of_incorporation' => $request->input('state_of_incorporation'),
                    'organizational_structure' => $request->input('organizational_structure'),
                    'contact_phone' => $request->input('contact_phone'),
                    'contact_email' => $request->input('contact_email'),
                    'website' => $request->input('website'),
                    'organizing_documents' => $organizingDocuments ?: $application->organizing_documents,
                    'bylaws_document' => $bylawsDocuments ?: $application->bylaws_document,
                    'officers_directors' => $request->input('officers_directors', []),
                    'conflict_of_interest_policy_document' => $conflictPolicyDocument ? [$conflictPolicyDocument] : ($application->conflict_of_interest_policy_document ?: null),
                    'organizational_chart_document' => $orgChartDocument ? [$orgChartDocument] : ($application->organizational_chart_document ?: null),
                    'related_organizations' => $request->input('related_organizations', []),
                    'mission_statement' => $request->input('mission_statement'),
                    'activities' => $request->input('activities', []),
                    'fundraising_materials' => $fundraisingMaterials ?: $application->fundraising_materials,
                    'financial_statements' => $financialStatements ?: $application->financial_statements,
                    'revenue_sources' => $request->input('revenue_sources', []),
                    'budget_per_program' => $request->input('budget_per_program', []),
                    'major_contributors' => $request->input('major_contributors', []),
                    'fundraising_activities' => $fundraisingActivities,
                    'prior_year_tax_filings' => $priorYearTaxFilings ?: $application->prior_year_tax_filings,
                    'compensation_arrangements' => $request->input('compensation_arrangements', []),
                    'related_party_agreements' => $relatedPartyAgreements,
                    'political_activities_yes_no' => $request->input('political_activities_yes_no'),
                    'political_activities_desc' => $request->input('political_activities_desc'),
                    'grants' => $request->input('grants', []),
                    'foreign_activities_yes_no' => $request->input('foreign_activities_yes_no'),
                    'foreign_activities_desc' => $request->input('foreign_activities_desc'),
                    'form_ss4_confirmation' => $ss4Confirmation ? [$ss4Confirmation] : ($application->form_ss4_confirmation ?: null),
                    'board_meeting_minutes' => $boardMinutes ? [$boardMinutes] : ($application->board_meeting_minutes ?: null),
                    'whistleblower_policy_document' => $whistleblowerPolicy ? [$whistleblowerPolicy] : ($application->whistleblower_policy_document ?: null),
                ]);
            });

            // Check if this is a draft save
            $isDraftSave = $request->has('save_as_draft') && $request->input('save_as_draft') == '1';
            
            // If saving as draft, set organization status and redirect
            if ($isDraftSave) {
                // Set organization status to inactive
                $organization->status = 'Inactive';
                $organization->save();

                // Assign organization role and remove organization_pending role
                // This will also set registration_status to 'approved'
                $this->assignOrganizationRole($user);

                return redirect()->route('form1023.apply.show')->with('success', 'Your Form 1023 application has been saved as draft. Your organization registration status has been approved. You can complete the payment later.');
            }

            $checkout = $user->checkoutCharge(
                $amountInCents,
                'Form 1023 - Application for Recognition of Exemption',
                1,
                [
                    'success_url' => route('form1023.apply.success', $application) . '?session_id={CHECKOUT_SESSION_ID}',
                    'cancel_url' => route('form1023.apply.cancel', $application),
                    'metadata' => [
                        'type' => 'form_1023_application',
                        'application_id' => $application->id,
                        'application_number' => $application->application_number,
                        'organization_id' => $organization->id,
                        'user_id' => $user->id,
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

            $organization->status = 'Inactive';
            $organization->save();
            
            // This will also set registration_status to 'approved'
            $this->assignOrganizationRole($user);

            return redirect($checkout->url);
        } catch (\Exception $exception) {
            Log::error('Form 1023 application update error', [
                'error' => $exception->getMessage(),
                'organization_id' => $organization->id,
                'application_id' => $application->id,
            ]);

            return back()->withErrors([
                'message' => 'An error occurred while updating your application. Please try again.',
            ]);
        }
    }

    public function saveAsDraft(Request $request)
    {
        $user = $request->user();
        
        // Only allow organization users, not admins
        if ($user->role === 'admin') {
            abort(403, 'Form 1023 is only available for organization users.');
        }
        
        $organization = $user->organization;

        if (!$organization) {
            return redirect()->route('dashboard')->with('error', 'You are not eligible to submit a Form 1023 application.');
        }

        // Only allow if organization doesn't have EIN in database (has_edited_irs_data = true means EIN was not found)
        if (!$organization->has_edited_irs_data && $organization->registration_status === 'approved') {
            return redirect()->route('dashboard')->with('error', 'Form 1023 is only available for organizations not found in the IRS database.');
        }

        // Check for existing draft or needs_more_info application to update
        $existingApplication = null;
        if ($request->has('application_id') || $request->has('_application_id')) {
            $appId = $request->input('application_id') ?: $request->input('_application_id');
            $existingApplication = $organization->form1023Applications()
                ->where('id', $appId)
                ->whereIn('status', ['draft', 'needs_more_info'])
                ->first();
        }
        
        if (!$existingApplication) {
            $existingApplication = $organization->form1023Applications()
                ->whereIn('status', ['draft', 'needs_more_info'])
                ->latest()
                ->first();
        }

        // For editing: ALL files are optional (they already exist in database)
        // For new: files are required
        $fileArrayRule = $existingApplication ? ['nullable', 'array', 'max:10'] : ['required', 'array', 'min:1', 'max:10'];
        $fileSingleRule = $existingApplication ? ['nullable', 'file', 'mimes:pdf', 'max:10240'] : ['required', 'file', 'mimes:pdf', 'max:10240'];
        $fileSingleRuleWithImages = ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'];

        // Use the same validation as store method but allow draft status
        $validated = $request->validate([
            // A. Basic Organization Information - REQUIRED
            'legal_name' => ['required', 'string', 'max:255'],
            'ein' => ['required', 'string', 'size:9', 'regex:/^[0-9]{9}$/'],
            'mailing_address' => ['required', 'string', 'max:1000'],
            'physical_address' => ['nullable', 'string', 'max:1000'],
            'date_incorporated' => ['required', 'date', 'before_or_equal:today'],
            'state_of_incorporation' => ['required', 'string', 'max:100'],
            'organizational_structure' => ['required', 'string', 'in:corporation,trust,association,other'],
            'contact_phone' => ['required', 'string', 'max:50'],
            'contact_email' => ['required', 'email', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
            // B. Organizational Structure & Governance - FILES OPTIONAL WHEN EDITING
            'organizing_documents' => $fileArrayRule,
            'organizing_documents.*' => ['file', 'mimes:pdf', 'max:10240'],
            'bylaws_document' => $fileArrayRule,
            'bylaws_document.*' => ['file', 'mimes:pdf', 'max:10240'],
            'officers_directors' => ['required', 'array', 'min:1'],
            'officers_directors.*.name' => ['required', 'string', 'max:255'],
            'officers_directors.*.title' => ['required', 'string', 'max:255'],
            'officers_directors.*.address' => ['nullable', 'string', 'max:500'],
            'officers_directors.*.compensation' => ['nullable', 'numeric', 'min:0'],
            'officers_directors.*.hours_per_week' => ['nullable', 'numeric', 'min:0', 'max:168'],
            'conflict_of_interest_policy_document' => $fileSingleRule,
            'organizational_chart_document' => $fileSingleRuleWithImages,
            'related_organizations' => ['nullable', 'array'],
            // C. Purpose & Activities - REQUIRED
            'mission_statement' => ['required', 'string', 'min:10', 'max:5000'],
            'activities' => ['required', 'array', 'min:1'],
            'activities.*.activity_name' => ['required', 'string', 'max:255'],
            'activities.*.description' => ['required', 'string', 'min:20', 'max:5000'],
            'activities.*.beneficiaries' => ['required', 'string', 'min:10', 'max:2000'],
            'activities.*.funding_source' => ['required', 'string', 'min:20', 'max:2000'],
            'fundraising_materials' => ['nullable', 'array', 'max:10'],
            'fundraising_materials.*' => ['file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            // D. Financial Information - FILES OPTIONAL WHEN EDITING
            'financial_statements' => $fileArrayRule,
            'financial_statements.*' => ['file', 'mimes:pdf', 'max:10240'],
            'revenue_sources' => ['required', 'array', 'min:1'],
            'revenue_sources.*.source' => ['required', 'string', 'max:255'],
            'revenue_sources.*.amount' => ['required', 'numeric', 'min:0'],
            'budget_per_program' => ['required', 'array', 'min:1'],
            'budget_per_program.*.program' => ['required', 'string', 'max:255'],
            'budget_per_program.*.amount' => ['required', 'numeric', 'min:0'],
            'major_contributors' => ['nullable', 'array'],
            'major_contributors.*.name' => ['required_with:major_contributors', 'string', 'max:255'],
            'major_contributors.*.amount' => ['required_with:major_contributors', 'numeric', 'min:5000'],
            'major_contributors.*.frequency' => ['nullable', 'string', 'in:one-time,monthly,quarterly,annually'],
            'fundraising_activities' => ['nullable', 'array'],
            'prior_year_tax_filings' => ['nullable', 'array', 'max:10'],
            'prior_year_tax_filings.*' => ['file', 'mimes:pdf', 'max:10240'],
            // E. Operational Details - OPTIONAL
            'compensation_arrangements' => ['nullable', 'array'],
            'related_party_agreements' => ['nullable', 'array'],
            'political_activities_yes_no' => ['nullable', 'string', 'in:Yes,No'],
            'political_activities_desc' => ['nullable', 'string', 'max:2000'],
            'grants' => ['nullable', 'array'],
            'foreign_activities_yes_no' => ['nullable', 'string', 'in:Yes,No'],
            'foreign_activities_desc' => ['nullable', 'string', 'max:2000'],
            // F. Supporting Documents - FILES OPTIONAL WHEN EDITING
            'form_ss4_confirmation' => $fileSingleRule,
            'board_meeting_minutes' => ['nullable', 'file', 'mimes:pdf', 'max:10240'],
            'whistleblower_policy_document' => ['nullable', 'file', 'mimes:pdf', 'max:10240'],
        ]);

        $applicationFee = (float) AdminSetting::get('form_1023_application_fee', 600.00);

        $activeApplication = $organization->form1023Applications()
            ->whereIn('status', ['pending_payment', 'awaiting_review'])
            ->latest()
            ->first();

        if ($activeApplication && !$existingApplication) {
            return back()->withErrors([
                'message' => 'A Form 1023 application is already in progress. Please wait for review before submitting another.',
            ]);
        }

        try {
            $application = null;

            DB::transaction(function () use ($request, $organization, $applicationFee, $user, $existingApplication, &$application) {
                // Reuse the same helper functions from store method
                $handleFileUploads = function ($files, $directory) {
                    $uploaded = [];
                    if ($files) {
                        $fileArray = is_array($files) ? $files : [$files];
                        foreach ($fileArray as $file) {
                            $path = $file->store($directory, 'public');
                            $uploaded[] = [
                                'path' => $path,
                                'name' => $file->getClientOriginalName(),
                                'mime' => $file->getClientMimeType(),
                                'size' => $file->getSize(),
                            ];
                        }
                    }
                    return $uploaded;
                };

                $handleSingleFileUpload = function ($file, $directory) {
                    if ($file) {
                        $path = $file->store($directory, 'public');
                        return [
                            'path' => $path,
                            'name' => $file->getClientOriginalName(),
                            'mime' => $file->getClientMimeType(),
                            'size' => $file->getSize(),
                        ];
                    }
                    return null;
                };

                // Handle all file uploads - preserve existing files if no new ones uploaded
                $organizingDocuments = $handleFileUploads($request->file('organizing_documents'), 'form1023/organizing-documents');
                if (empty($organizingDocuments) && $existingApplication && $existingApplication->organizing_documents) {
                    $organizingDocuments = $existingApplication->organizing_documents;
                }
                
                $bylawsDocuments = $handleFileUploads($request->file('bylaws_document'), 'form1023/bylaws');
                if (empty($bylawsDocuments) && $existingApplication && $existingApplication->bylaws_document) {
                    $bylawsDocuments = $existingApplication->bylaws_document;
                }
                
                $fundraisingMaterials = $handleFileUploads($request->file('fundraising_materials'), 'form1023/fundraising-materials');
                if (empty($fundraisingMaterials) && $existingApplication && $existingApplication->fundraising_materials) {
                    $fundraisingMaterials = $existingApplication->fundraising_materials;
                }
                
                $financialStatements = $handleFileUploads($request->file('financial_statements'), 'form1023/financial-statements');
                if (empty($financialStatements) && $existingApplication && $existingApplication->financial_statements) {
                    $financialStatements = $existingApplication->financial_statements;
                }
                
                $priorYearTaxFilings = $handleFileUploads($request->file('prior_year_tax_filings'), 'form1023/prior-year-tax');
                if (empty($priorYearTaxFilings) && $existingApplication && $existingApplication->prior_year_tax_filings) {
                    $priorYearTaxFilings = $existingApplication->prior_year_tax_filings;
                }
                
                $conflictPolicyDocument = $handleSingleFileUpload($request->file('conflict_of_interest_policy_document'), 'form1023/conflict-policy');
                if (!$conflictPolicyDocument && $existingApplication && $existingApplication->conflict_of_interest_policy_document) {
                    $conflictPolicyDocArray = is_array($existingApplication->conflict_of_interest_policy_document) 
                        ? $existingApplication->conflict_of_interest_policy_document 
                        : [$existingApplication->conflict_of_interest_policy_document];
                    $conflictPolicyDocument = !empty($conflictPolicyDocArray) ? $conflictPolicyDocArray[0] : null;
                }
                
                $orgChartDocument = $handleSingleFileUpload($request->file('organizational_chart_document'), 'form1023/organizational-chart');
                if (!$orgChartDocument && $existingApplication && $existingApplication->organizational_chart_document) {
                    $orgChartDocArray = is_array($existingApplication->organizational_chart_document) 
                        ? $existingApplication->organizational_chart_document 
                        : [$existingApplication->organizational_chart_document];
                    $orgChartDocument = !empty($orgChartDocArray) ? $orgChartDocArray[0] : null;
                }
                
                $ss4Confirmation = $handleSingleFileUpload($request->file('form_ss4_confirmation'), 'form1023/ss4-confirmation');
                if (!$ss4Confirmation && $existingApplication && $existingApplication->form_ss4_confirmation) {
                    $ss4ConfArray = is_array($existingApplication->form_ss4_confirmation) 
                        ? $existingApplication->form_ss4_confirmation 
                        : [$existingApplication->form_ss4_confirmation];
                    $ss4Confirmation = !empty($ss4ConfArray) ? $ss4ConfArray[0] : null;
                }
                
                $boardMinutes = $handleSingleFileUpload($request->file('board_meeting_minutes'), 'form1023/board-minutes');
                if (!$boardMinutes && $existingApplication && $existingApplication->board_meeting_minutes) {
                    $boardMinutesArray = is_array($existingApplication->board_meeting_minutes) 
                        ? $existingApplication->board_meeting_minutes 
                        : [$existingApplication->board_meeting_minutes];
                    $boardMinutes = !empty($boardMinutesArray) ? $boardMinutesArray[0] : null;
                }
                
                $whistleblowerPolicy = $handleSingleFileUpload($request->file('whistleblower_policy_document'), 'form1023/whistleblower-policy');
                if (!$whistleblowerPolicy && $existingApplication && $existingApplication->whistleblower_policy_document) {
                    $whistleblowerArray = is_array($existingApplication->whistleblower_policy_document) 
                        ? $existingApplication->whistleblower_policy_document 
                        : [$existingApplication->whistleblower_policy_document];
                    $whistleblowerPolicy = !empty($whistleblowerArray) ? $whistleblowerArray[0] : null;
                }

                // Handle file uploads in repeater fields
                $fundraisingActivities = $request->input('fundraising_activities', []);
                if (is_array($fundraisingActivities)) {
                    foreach ($fundraisingActivities as &$activity) {
                        if (isset($activity['contract']) && $activity['contract'] instanceof \Illuminate\Http\UploadedFile) {
                            $contractFile = $handleSingleFileUpload($activity['contract'], 'form1023/fundraising-contracts');
                            $activity['contract'] = $contractFile;
                        }
                    }
                }

                $relatedPartyAgreements = $request->input('related_party_agreements', []);
                if (is_array($relatedPartyAgreements)) {
                    foreach ($relatedPartyAgreements as &$agreement) {
                        if (isset($agreement['document']) && $agreement['document'] instanceof \Illuminate\Http\UploadedFile) {
                            $docFile = $handleSingleFileUpload($agreement['document'], 'form1023/related-party-agreements');
                            $agreement['document'] = $docFile;
                        }
                    }
                }

                // Update existing application or create new one
                $applicationData = [
                    'status' => 'draft',
                    'amount' => $applicationFee,
                    'currency' => 'usd',
                    'payment_status' => 'pending',
                    // A. Basic Organization Information
                    'legal_name' => $request->input('legal_name'),
                    'mailing_address' => $request->input('mailing_address'),
                    'physical_address' => $request->input('physical_address'),
                    'ein' => $request->input('ein'),
                    'date_incorporated' => $request->input('date_incorporated'),
                    'state_of_incorporation' => $request->input('state_of_incorporation'),
                    'organizational_structure' => $request->input('organizational_structure'),
                    'contact_phone' => $request->input('contact_phone'),
                    'contact_email' => $request->input('contact_email'),
                    'website' => $request->input('website'),
                    // B. Organizational Structure & Governance
                    'organizing_documents' => $organizingDocuments,
                    'bylaws_document' => $bylawsDocuments,
                    'officers_directors' => $request->input('officers_directors', []),
                    'conflict_of_interest_policy_document' => $conflictPolicyDocument ? [$conflictPolicyDocument] : ($existingApplication ? $existingApplication->conflict_of_interest_policy_document : null),
                    'organizational_chart_document' => $orgChartDocument ? [$orgChartDocument] : ($existingApplication ? $existingApplication->organizational_chart_document : null),
                    'related_organizations' => $request->input('related_organizations', []),
                    // C. Purpose & Activities
                    'mission_statement' => $request->input('mission_statement'),
                    'activities' => $request->input('activities', []),
                    'fundraising_materials' => $fundraisingMaterials,
                    // D. Financial Information
                    'financial_statements' => $financialStatements,
                    'revenue_sources' => $request->input('revenue_sources', []),
                    'budget_per_program' => $request->input('budget_per_program', []),
                    'major_contributors' => $request->input('major_contributors', []),
                    'fundraising_activities' => $fundraisingActivities,
                    'prior_year_tax_filings' => $priorYearTaxFilings,
                    // E. Operational Details
                    'compensation_arrangements' => $request->input('compensation_arrangements', []),
                    'related_party_agreements' => $relatedPartyAgreements,
                    'political_activities_yes_no' => $request->input('political_activities_yes_no'),
                    'political_activities_desc' => $request->input('political_activities_desc'),
                    'grants' => $request->input('grants', []),
                    'foreign_activities_yes_no' => $request->input('foreign_activities_yes_no'),
                    'foreign_activities_desc' => $request->input('foreign_activities_desc'),
                    // F. Supporting Documents
                    'form_ss4_confirmation' => $ss4Confirmation ? [$ss4Confirmation] : ($existingApplication ? $existingApplication->form_ss4_confirmation : null),
                    'board_meeting_minutes' => $boardMinutes ? [$boardMinutes] : ($existingApplication ? $existingApplication->board_meeting_minutes : null),
                    'whistleblower_policy_document' => $whistleblowerPolicy ? [$whistleblowerPolicy] : ($existingApplication ? $existingApplication->whistleblower_policy_document : null),
                ];
                
                if ($existingApplication) {
                    $application = $existingApplication;
                    $application->update($applicationData);
                } else {
                    $applicationData['organization_id'] = $organization->id;
                    $applicationData['application_number'] = Form1023Application::generateApplicationNumber();
                    $application = Form1023Application::create($applicationData);
                }

                // Set organization status to inactive
                $organization->status = 'Inactive';
                $organization->save();

                // Assign organization role and remove organization_pending role
                // This will also set registration_status to 'approved'
                $this->assignOrganizationRole($user);
            });

            return redirect()->route('form1023.apply.show')->with('success', 'Your Form 1023 application has been saved as draft. Your organization registration status has been approved. You can complete the payment later.');
        } catch (\Exception $exception) {
            Log::error('Form 1023 application draft save error', [
                'error' => $exception->getMessage(),
                'organization_id' => $organization->id,
            ]);

            return back()->withErrors([
                'message' => 'Unable to save application. Please try again later.',
            ]);
        }
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

            Log::info('Role assigned successfully', [
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
}
