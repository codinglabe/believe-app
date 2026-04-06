<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('form_1023_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('application_number')->unique();
            $table->string('status')->default('draft'); // draft, pending_payment, awaiting_review, needs_more_info, approved, declined, cancelled
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('usd');
            $table->string('payment_status')->default('pending'); // pending, paid, cancelled, refunded
            $table->string('stripe_session_id')->nullable();
            $table->string('stripe_payment_intent')->nullable();
            
            // A. Basic Organization Information
            $table->string('legal_name')->nullable(); // Legal name (as in Articles of Incorporation) - TEXT
            $table->text('mailing_address')->nullable(); // Mailing address - TEXTAREA
            $table->text('physical_address')->nullable(); // Physical address (if different) - TEXTAREA
            $table->string('ein')->nullable(); // Employer Identification Number (EIN) - TEXT
            $table->date('date_incorporated')->nullable(); // Date of incorporation or formation - DATE
            $table->string('state_of_incorporation')->nullable(); // State of incorporation - SELECT
            $table->string('organizational_structure')->nullable(); // Type of entity (corporation, trust, unincorporated association, etc.) - SELECT
            $table->string('contact_phone')->nullable(); // Phone number - TEXT
            $table->string('contact_email')->nullable(); // Email address - EMAIL
            $table->string('website')->nullable(); // Website (if any) - URL
            
            // B. Organizational Structure & Governance
            $table->json('organizing_documents')->nullable(); // Articles of Incorporation (with nonprofit and charitable purpose clause) - FILE (multiple) - JSON ARRAY
            $table->json('bylaws_document')->nullable(); // Bylaws (signed and dated) - FILE (multiple) - JSON ARRAY
            $table->json('officers_directors')->nullable(); // Names, titles, addresses, and compensation of all officers, directors, and key employees - REPEATER - JSON ARRAY
            $table->json('conflict_of_interest_policy_document')->nullable(); // Conflict of Interest Policy - FILE (single) - JSON ARRAY
            $table->json('organizational_chart_document')->nullable(); // Organizational Chart (showing control, if applicable) - FILE (single, optional) - JSON ARRAY
            $table->json('related_organizations')->nullable(); // Information on related organizations (subsidiaries, parent orgs, affiliates, etc.) - REPEATER - JSON ARRAY
            
            // C. Purpose & Activities
            $table->text('mission_statement')->nullable(); // Clear statement of mission/purpose (charitable, educational, religious, scientific, literary, etc.) - TEXTAREA
            $table->json('activities')->nullable(); // Detailed description of past, present, and planned activities (What does org do? Who benefits? How funded?) - REPEATER - JSON ARRAY
            $table->json('fundraising_materials')->nullable(); // Copies of brochures, advertisements, or website pages describing activities - FILE (multiple) - JSON ARRAY
            
            // D. Financial Information
            $table->json('financial_statements')->nullable(); // Current year and three-year projected financial statements (income and expenses) - FILE (multiple) - JSON ARRAY
            $table->json('revenue_sources')->nullable(); // Sources of revenue (donations, grants, membership fees, sales, etc.) - REPEATER - JSON ARRAY
            $table->json('budget_per_program')->nullable(); // Estimated budget for each major program activity - REPEATER - JSON ARRAY
            $table->json('major_contributors')->nullable(); // List of contributors expected to donate more than $5,000 annually - REPEATER - JSON ARRAY
            $table->json('fundraising_activities')->nullable(); // Details of any fundraising activities and contracts with fundraisers - REPEATER - JSON ARRAY
            $table->json('prior_year_tax_filings')->nullable(); // Copies of prior-year tax filings (if applicable) - FILE (multiple, optional) - JSON ARRAY
            
            // E. Operational Details
            $table->json('compensation_arrangements')->nullable(); // Description of compensation arrangements for officers and key employees - REPEATER - JSON ARRAY
            $table->json('related_party_agreements')->nullable(); // Any lease, rental, or service agreements between related parties - REPEATER - JSON ARRAY
            $table->string('political_activities_yes_no')->nullable(); // Details of political or lobbying activities (if any) - RADIO (Yes/No) - STRING
            $table->text('political_activities_desc')->nullable(); // If Yes, describe political/lobbying activities - TEXTAREA (conditional)
            $table->json('grants')->nullable(); // Description of grants made or planned to other organizations or individuals - REPEATER - JSON ARRAY
            $table->string('foreign_activities_yes_no')->nullable(); // Information on foreign activities, if applicable - RADIO (Yes/No) - STRING
            $table->text('foreign_activities_desc')->nullable(); // If Yes, describe foreign activities - TEXTAREA (conditional)
            
            // F. Supporting Documents
            // Note: Articles of Incorporation and Bylaws are same as B.1 and B.2 (stored in organizing_documents and bylaws_document)
            $table->json('form_ss4_confirmation')->nullable(); // IRS Form SS-4 confirmation letter (EIN issuance) - FILE (single) - JSON ARRAY
            $table->json('board_meeting_minutes')->nullable(); // Board meeting minutes approving nonprofit formation - FILE (single, optional) - JSON ARRAY
            // Note: Conflict of Interest Policy is same as B.4 (stored in conflict_of_interest_policy_document)
            $table->json('whistleblower_policy_document')->nullable(); // Whistleblower Policy - FILE (single, optional) - JSON ARRAY
            // Note: Fundraising materials are same as C.3 (stored in fundraising_materials)
            
            // Application metadata
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('admin_notes')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('form_1023_applications');
    }
};
