<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Form1023Application extends Model
{
    use HasFactory;

    protected $table = 'form_1023_applications';

    protected $fillable = [
        'organization_id',
        'application_number',
        'status',
        'amount',
        'currency',
        'payment_status',
        'stripe_session_id',
        'stripe_payment_intent',
        // A. Basic Organization Information
        'legal_name',
        'mailing_address',
        'physical_address',
        'ein',
        'date_incorporated',
        'state_of_incorporation',
        'organizational_structure',
        'contact_phone',
        'contact_email',
        'website',
        // B. Organizational Structure & Governance
        'organizing_documents',
        'bylaws_document',
        'officers_directors',
        'conflict_of_interest_policy_document',
        'organizational_chart_document',
        'related_organizations',
        // C. Purpose & Activities
        'mission_statement',
        'activities',
        'fundraising_materials',
        // D. Financial Information
        'financial_statements',
        'revenue_sources',
        'budget_per_program',
        'major_contributors',
        'fundraising_activities',
        'prior_year_tax_filings',
        // E. Operational Details
        'compensation_arrangements',
        'related_party_agreements',
        'political_activities_yes_no',
        'political_activities_desc',
        'grants',
        'foreign_activities_yes_no',
        'foreign_activities_desc',
        // F. Supporting Documents
        'form_ss4_confirmation',
        'board_meeting_minutes',
        'whistleblower_policy_document',
        // Application metadata
        'submitted_at',
        'reviewed_at',
        'reviewed_by',
        'admin_notes',
        'meta',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'date_incorporated' => 'date',
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'organizing_documents' => 'array',
        'bylaws_document' => 'array',
        'officers_directors' => 'array',
        'conflict_of_interest_policy_document' => 'array',
        'organizational_chart_document' => 'array',
        'related_organizations' => 'array',
        'activities' => 'array',
        'fundraising_materials' => 'array',
        'financial_statements' => 'array',
        'revenue_sources' => 'array',
        'budget_per_program' => 'array',
        'major_contributors' => 'array',
        'fundraising_activities' => 'array',
        'prior_year_tax_filings' => 'array',
        'compensation_arrangements' => 'array',
        'related_party_agreements' => 'array',
        'grants' => 'array',
        'form_ss4_confirmation' => 'array',
        'board_meeting_minutes' => 'array',
        'whistleblower_policy_document' => 'array',
        'meta' => 'array',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public static function generateApplicationNumber(): string
    {
        do {
            $number = '1023-' . strtoupper(bin2hex(random_bytes(3))) . '-' . now()->format('ymd');
        } while (self::where('application_number', $number)->exists());

        return $number;
    }
}
