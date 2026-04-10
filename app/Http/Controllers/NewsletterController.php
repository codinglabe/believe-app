<?php

namespace App\Http\Controllers;

use App\Jobs\SendNewsletterJob;
use App\Models\EmailPackage;
use App\Models\Newsletter;
use App\Models\NewsletterEmail;
use App\Models\NewsletterRecipient;
use App\Models\NewsletterTemplate;
use App\Models\Organization;
use App\Models\SmsPackage;
use App\Models\User;
use App\Services\OpenAiService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Cashier\Cashier;
use Stripe\PaymentIntent;

class NewsletterController extends BaseController
{
    /**
     * Merge variables allowed in AI-generated templates (must match the template editor / preview).
     *
     * @var list<string>
     */
    /** GSM single-segment style limit for SMS plain body (user-facing + AI). */
    private const NEWSLETTER_SMS_PLAIN_MAX_CHARS = 160;

    /** Verified users per scroll “page” on advanced newsletter targeting pickers. */
    private const NEWSLETTER_ADVANCED_USERS_PER_PAGE = 40;

    private const NEWSLETTER_TEMPLATE_MERGE_KEYS = [
        'organization_name',
        'organization_email',
        'organization_phone',
        'organization_address',
        'recipient_name',
        'recipient_email',
        'current_date',
        'current_year',
        'unsubscribe_link',
        'public_view_link',
    ];

    /**
     * @return list<string>
     */
    private function newsletterTemplateMergeKeys(): array
    {
        return self::NEWSLETTER_TEMPLATE_MERGE_KEYS;
    }

    private function newsletterTemplateMergeVarsPromptLine(): string
    {
        return implode(', ', array_map(fn (string $k) => '{'.$k.'}', self::NEWSLETTER_TEMPLATE_MERGE_KEYS));
    }

    /**
     * Rules for AI-generated plain text: professional tone, structure, length — not cramped “SMS-only” microcopy.
     */
    /**
     * AI rules when the campaign is SMS-only: one short GSM-style segment for "content".
     */
    private function newsletterAiSmsPlainCopyQualityRules(): string
    {
        $n = self::NEWSLETTER_SMS_PLAIN_MAX_CHARS;

        return <<<RULES
SMS PLAIN TEXT (strict length):
- The "content" field MUST be at most {$n} characters total (count spaces and line breaks; use mb-safe length mentally). This is the entire SMS body subscribers see (aside from the subject line sent above it in the app).
- Write one tight message: usually one or two short sentences, or one sentence plus a line with {unsubscribe_link} if it still fits within {$n} characters. No long newsletters.
- Put the key idea in the first sentence. Merge tokens like {unsubscribe_link} count toward the limit in the final editor—keep the draft short enough that expanded URLs still work for your use case.
- Subject: keep it short and punchy (aim under 72 characters); it appears above the body in the SMS preview.
RULES;
    }

    private function newsletterAiPlainCopyQualityRules(): string
    {
        return <<<'RULES'
PROFESSIONAL PLAIN-TEXT COPY (not tiny, not shallow):
- Write like a senior nonprofit communications lead: warm, confident, clear, donor-appropriate. No filler, no robotic stock phrases.
- Structure: optional short kicker line; a strong headline line; 3–7 paragraphs separated by double \n; optional short bullet lines using "• " or "- "; a clear call-to-action; closing line; footer with Unsubscribe using exactly {unsubscribe_link} (and {public_view_link} only where a browser link makes sense).
- Length: unless the user brief is intentionally very short, aim for roughly 180–500 words for newsletters and substantive announcements—never a single cramped paragraph or a list of tiny one-line fragments only.
- Spacing: use double line breaks between sections so the text breathes; avoid walls of dense micro-sentences.
- Voice: varied sentence length; concrete details from the brief; professional vocabulary without being stiff.
RULES;
    }

    /**
     * Hard clamp for SMS plain body (AI output or pasted text).
     */
    private function clampNewsletterSmsPlainBody(string $content): string
    {
        $max = self::NEWSLETTER_SMS_PLAIN_MAX_CHARS;
        $content = trim($content);
        if ($content === '' || mb_strlen($content) <= $max) {
            return $content;
        }

        $trunc = mb_substr($content, 0, $max);
        $lastSpace = mb_strrpos($trunc, ' ');
        if ($lastSpace !== false && $lastSpace > (int) ($max * 0.5)) {
            $trunc = mb_substr($trunc, 0, $lastSpace);
        }

        return rtrim($trunc, " \t.,;:").'…';
    }

    /**
     * Shared HTML email design instructions for AI (inline CSS, dark + light, varied palettes — not flat all-white).
     */
    private function newsletterAiHtmlDesignInstructions(string $tone): string
    {
        return <<<AIHTML
EMAIL HTML DESIGN — premium, highly stylized, email-client safe:
Goal: every email must look like a designed product from a top nonprofit or brand—bold color harmony, clear hierarchy, deliberate UI. Forbidden: a flat “black text on plain white only” layout with no colored structure. Forbidden: washed-out gray-only design with no strong accent.

DARK / LIGHT & PALETTE VARIETY (mandatory):
- Include at least ONE prominent dark or rich band: e.g. header strip, hero block, mid-body feature strip, or footer with background #0f172a, #18181b, #1e1b4b, #14532d, #7f1d1d, #4c1d95, or similar deep tone, with light text (#f8fafc–#ffffff) OR high-contrast inverse. Light content areas are fine, but the design must not be “all light / all white canvas only.”
- Pick ONE cohesive palette per email with 4–6 intentional colors: deep neutral + surface + saturated accent + muted secondary text + hairline borders. Rotate feel by tone: e.g. midnight + electric blue + cloud white; forest + antique gold + ivory; wine + blush + charcoal; slate + emerald CTA + cream panel—not the same blue-on-white every time.
- Ensure WCAG-ish contrast: body text on backgrounds must stay readable (no light gray #cbd5e1 on white for main copy).

Technical rules (must follow):
- Use ONLY inline CSS (style attributes on elements). No <style> blocks, no external stylesheets, no @import, no <script>, no web fonts from URLs.
- Quoting: use double quotes for style= attributes whenever the CSS value contains single-quoted font names, e.g. style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; ..." — never break HTML with mismatched quotes.
- Layout: outer wrapper table role="presentation" width="100%"; inner main column max-width 600px centered. Use nested tables for rows/sections where helpful (email-safe).

Reference palettes (adapt—do not copy blindly every time; vary with the brief and tone "{$tone}"):
  • Professional / trust: charcoal #0f172a, body #334155, accent #2563eb or #0369a1, soft panels #f1f5f9 / #eff6ff, white cards #ffffff, optional dark footer band #0f172a.
  • Warm / community: espresso #422006, body #78350f, accent #c2410c or #b45309, cream #fffbeb, peach tint #fff7ed.
  • Urgent / timely: near-black #171717, body #404040, accent #dc2626 or #ea580c, pale alert #fef2f2.
  • Celebratory: plum #5b21b6, accent #c026d3 or #db2777, gold #ca8a04, lilac panel #faf5ff.

Visual styling (apply several—not minimal):
- Thin colored top accent bar (4–6px) full width in primary accent.
- Eyebrow / kicker: small uppercase, letter-spaced, accent color (e.g. font-size:11px; letter-spacing:0.12em; font-weight:600).
- Main headline: 22–28px, extra-bold, strong contrast against its background.
- Alternate section backgrounds: white vs subtle tinted rows (#f8fafc, #f1f5f9, or 4–8% accent tint).
- Pull quote or highlight: left border 4px solid accent; tinted background; padding 16–20px.
- Primary CTA: inline-block; padding:14px 32px; strong accent background; color:#ffffff; border-radius:8px; font-weight:700; optional box-shadow:0 4px 14px rgba(0,0,0,0.12). href="#" or allowed merge tokens only.
- Dividers: 1px solid muted (#e2e8f0 or from palette).
- Footer: distinct band—often dark (#0f172a / #18181b) with muted text #94a3b8, {organization_name}, <a href="{unsubscribe_link}" style="color:#cbd5e1;">Unsubscribe</a>; optional <a href="{public_view_link}">View in browser</a>.

Typography (inline): font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; body 15–17px, line-height 1.65–1.7; headings clearly larger and colored—not browser defaults.

Images: omit <img> unless the brief asks; never broken URLs.

Tone: {$tone}, trustworthy—but visually striking and brand-quality, not generic.
AIHTML;
    }

    /**
     * Ensure AI output uses only whitelisted {name} placeholders (no Handlebars, no invented keys).
     */
    private function validateTemplateAiMergeVariablesOnly(string $subject, string $content, string $htmlContent, string $suggestedName = ''): ?string
    {
        $allowed = $this->newsletterTemplateMergeKeys();
        $blob = $subject."\n".$content."\n".$htmlContent."\n".$suggestedName;

        if (str_contains($blob, '{{') || str_contains($blob, '}}')) {
            return 'The draft used unsupported placeholder syntax (double braces). Only these merge variables are allowed: '.$this->newsletterTemplateMergeVarsPromptLine();
        }

        if (preg_match_all('/\{([^{}]*)\}/', $blob, $matches)) {
            foreach ($matches[1] as $inner) {
                $key = trim((string) $inner);
                if ($key === '') {
                    return 'The draft contained empty {} placeholders. Use only: '.$this->newsletterTemplateMergeVarsPromptLine();
                }
                if (! in_array($key, $allowed, true)) {
                    return 'The draft used a merge variable that is not supported: {'.$key.'}. Allowed variables only: '.$this->newsletterTemplateMergeVarsPromptLine();
                }
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $decoded
     * @return array{0: string, 1: string, 2: string, 3: string} subject, content, htmlContent, suggestedName
     */
    private function normalizeTemplateAiDecodedPayload(array $decoded, string $outputMode): array
    {
        $subject = trim((string) ($decoded['subject'] ?? ''));
        $content = trim((string) ($decoded['content'] ?? ''));
        $htmlContent = trim((string) ($decoded['html_content'] ?? ''));
        $suggestedName = trim((string) ($decoded['suggested_name'] ?? ''));
        if ($outputMode === 'plain') {
            $htmlContent = '';
        }

        return [$subject, $content, $htmlContent, $suggestedName];
    }

    /**
     * @return array{ok: false, message: string, code: string}|null
     */
    private function templateAiPayloadIsIncomplete(
        string $subject,
        string $content,
        string $htmlContent,
        string $suggestedName,
        string $outputMode
    ): ?array {
        if ($outputMode === 'plain') {
            if ($subject === '' || $content === '' || $suggestedName === '') {
                return [
                    'ok' => false,
                    'message' => 'AI did not return a complete plain-text template (need template name, subject, and body). Try again.',
                    'code' => 'incomplete',
                ];
            }
        } elseif ($outputMode === 'both') {
            if ($subject === '' || $content === '' || $htmlContent === '' || $suggestedName === '') {
                return [
                    'ok' => false,
                    'message' => 'AI did not return a complete template (need template name, subject, SMS plain body, and HTML body). Try again.',
                    'code' => 'incomplete',
                ];
            }
        } elseif ($subject === '' || $htmlContent === '' || $suggestedName === '' || $content === '') {
            return [
                'ok' => false,
                'message' => 'AI did not return a complete HTML template (need template name, subject, plain-text body, and HTML body). Try again.',
                'code' => 'incomplete',
            ];
        }

        return null;
    }

    /**
     * @return array{0: string, 1: string, 2: string} subject, content, htmlContent
     */
    private function normalizeNewsletterCreateAiDecodedPayload(array $decoded, string $outputMode): array
    {
        $subject = trim((string) ($decoded['subject'] ?? ''));
        $content = trim((string) ($decoded['content'] ?? ''));
        $htmlContent = trim((string) ($decoded['html_content'] ?? ''));
        if ($outputMode === 'plain') {
            $htmlContent = '';
        }

        return [$subject, $content, $htmlContent];
    }

    /**
     * @return array{ok: false, message: string, code: string}|null
     */
    private function newsletterCreateAiPayloadIsIncomplete(
        string $subject,
        string $content,
        string $htmlContent,
        string $outputMode
    ): ?array {
        if ($outputMode === 'plain') {
            if ($subject === '' || $content === '') {
                return [
                    'ok' => false,
                    'message' => 'AI did not return a complete plain-text draft (need subject and body). Try again.',
                    'code' => 'incomplete',
                ];
            }
        } elseif ($outputMode === 'both') {
            if ($subject === '' || $content === '' || $htmlContent === '') {
                return [
                    'ok' => false,
                    'message' => 'AI did not return a complete draft (need subject, SMS plain body, and HTML body). Try again.',
                    'code' => 'incomplete',
                ];
            }
        } elseif ($subject === '' || $htmlContent === '' || $content === '') {
            return [
                'ok' => false,
                'message' => 'AI did not return a complete HTML draft (need subject, plain-text body, and HTML body). Try again.',
                'code' => 'incomplete',
            ];
        }

        return null;
    }

    /**
     * @param  array<string, mixed>|null  $newsletterCreateAiResult
     * @return array<string, mixed>
     */
    protected function newsletterCreatePageData(?array $newsletterCreateAiResult = null): array
    {
        $templates = NewsletterTemplate::where('is_active', true)
            ->select(['id', 'name', 'subject', 'content', 'template_type', 'html_content'])
            ->get();

        $user = Auth::user();

        $orgAddress = '';
        if ($user->organization) {
            $addressParts = array_filter([
                $user->organization->street,
                $user->organization->city,
                $user->organization->state,
                $user->organization->zip,
            ]);
            $orgAddress = ! empty($addressParts) ? implode(', ', $addressParts) : 'Your Organization Address';
        }

        $publicViewLink = url('/newsletter/public/preview');

        $previewData = [
            'organization_name' => $user->organization->name ?? ($user->name ?? 'Your Organization'),
            'organization_email' => $user->organization->email ?? ($user->email ?? 'wendhi@stuttiegroup.com'),
            'organization_phone' => $user->organization->phone ?? ($user->contact_number ?? '+1 (555) 000-0000'),
            'organization_address' => $orgAddress ?: 'Your Organization Address',
            'recipient_name' => $user->name ?? 'Recipient Name',
            'recipient_email' => $user->email ?? 'recipient@example.com',
            'current_date' => Carbon::now()->format('F j, Y'),
            'current_year' => (string) Carbon::now()->year,
            'unsubscribe_link' => url('/newsletter/unsubscribe?token=preview_token'),
            'public_view_link' => $publicViewLink,
        ];

        return array_merge([
            'templates' => $templates,
            'previewData' => $previewData,
            'openAiConfigured' => $this->openAiApiKeyIsConfigured(),
            'newsletterCreateAiResult' => $newsletterCreateAiResult,
        ], $this->newsletterSmsWalletProps());
    }

    /**
     * Email invite quota + prepaid SMS wallet (same model as /email-invite: included − used = remaining).
     *
     * @return array{emailStats: array{emails_included: int, emails_used: int, emails_left: int}, emailPackages: array<int, array<string, mixed>>, smsStats: array{sms_included: int, sms_used: int, sms_left: int}, smsPackages: array<int, array<string, mixed>>, smsAutoRechargeEnabled: bool}
     */
    protected function newsletterSmsWalletProps(): array
    {
        $user = Auth::user();
        $emailsIncluded = (int) ($user->emails_included ?? 0);
        $emailsUsed = (int) ($user->emails_used ?? 0);
        $emailsLeft = max(0, $emailsIncluded - $emailsUsed);

        $emailPackages = EmailPackage::active()->ordered()->get()->map(function ($p) {
            return [
                'id' => $p->id,
                'name' => $p->name,
                'description' => $p->description,
                'emails_count' => $p->emails_count,
                'price' => (float) $p->price,
            ];
        });

        $included = (int) ($user->sms_included ?? 0);
        $used = (int) ($user->sms_used ?? 0);
        $left = max(0, $included - $used);

        $packages = SmsPackage::active()->ordered()->get()->map(function ($p) {
            return [
                'id' => $p->id,
                'name' => $p->name,
                'description' => $p->description,
                'sms_count' => $p->sms_count,
                'price' => (float) $p->price,
            ];
        });

        return [
            'emailStats' => [
                'emails_included' => $emailsIncluded,
                'emails_used' => $emailsUsed,
                'emails_left' => $emailsLeft,
            ],
            'emailPackages' => $emailPackages,
            'smsStats' => [
                'sms_included' => $included,
                'sms_used' => $used,
                'sms_left' => $left,
            ],
            'smsPackages' => $packages,
            'smsAutoRechargeEnabled' => (bool) ($user->sms_auto_recharge_enabled ?? false),
        ];
    }

    /**
     * Organizations shown on the newsletter recipients list: approved registration only,
     * excluding internal Care Alliance hub rows (same notion of "real" orgs as elsewhere in the app).
     */
    protected function newsletterRecipientsOrganizationsQuery(): Builder
    {
        return Organization::query()
            ->active()
            ->excludingCareAllianceHubs()
            ->with(['user', 'newsletterRecipients']);
    }

    /**
     * Display newsletter dashboard
     */
    public function index(Request $request): Response
    {
        $this->authorizePermission($request, 'newsletter.read');

        $query = Newsletter::with(['template', 'organization'])
            ->select([
                'id', 'subject', 'status', 'scheduled_at', 'send_date',
                'sent_at', 'schedule_type', 'total_recipients', 'sent_count',
                'delivered_count', 'opened_count', 'clicked_count',
                'newsletter_template_id', 'organization_id',
            ]);

        // Apply search filter
        if ($request->has('search') && ! empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('subject', 'LIKE', "%{$search}%")
                    ->orWhereHas('template', function ($templateQuery) use ($search) {
                        $templateQuery->where('name', 'LIKE', "%{$search}%");
                    })
                    ->orWhereHas('organization', function ($orgQuery) use ($search) {
                        $orgQuery->where('name', 'LIKE', "%{$search}%");
                    });
            });
        }

        // Apply status filter
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $newsletters = $query->latest()->paginate(10);

        // Format all dates - Convert from UTC (database) to user's timezone
        $userTimezone = config('app.timezone', 'UTC');
        $newsletters->getCollection()->transform(function ($newsletter) use ($userTimezone) {
            if ($newsletter->scheduled_at) {
                // Get raw UTC value from database - Laravel stores as UTC string
                $rawValue = $newsletter->getRawOriginal('scheduled_at') ?? $newsletter->scheduled_at;
                $date = Carbon::parse($rawValue, 'UTC')->setTimezone($userTimezone);
                $newsletter->scheduled_at_formatted = $date->format('M d, Y h:i A');
                $newsletter->scheduled_at_iso = $date->toISOString();
            }
            if ($newsletter->send_date) {
                // Get raw UTC value from database
                $rawValue = $newsletter->getRawOriginal('send_date') ?? $newsletter->send_date;
                $date = Carbon::parse($rawValue, 'UTC')->setTimezone($userTimezone);
                $newsletter->send_date_formatted = $date->format('M d, Y h:i A');
                $newsletter->send_date_iso = $date->toISOString();
            }
            if ($newsletter->sent_at) {
                $rawValue = $newsletter->getRawOriginal('sent_at') ?? $newsletter->sent_at;
                $date = Carbon::parse($rawValue, 'UTC')->setTimezone($userTimezone);
                $newsletter->sent_at_formatted = $date->format('M d, Y h:i A');
            }

            return $newsletter;
        });

        $templates = NewsletterTemplate::where('is_active', true)->get();

        $recipients = NewsletterRecipient::active()->count();

        $stats = [
            'total_newsletters' => $newsletters->total(),
            'sent_newsletters' => Newsletter::where('status', 'sent')->count(),
            'total_recipients' => $recipients,
            'avg_open_rate' => $this->getAverageOpenRate(),
            'avg_click_rate' => $this->getAverageClickRate(),
        ];

        return Inertia::render('newsletter/index', array_merge([
            'newsletters' => $newsletters,
            'templates' => $templates,
            'stats' => $stats,
            'search' => $request->input('search', ''),
            'statusFilter' => $request->input('status', 'all'),
        ], $this->newsletterSmsWalletProps()));
    }

    /**
     * Export newsletters to CSV
     */
    public function export(Request $request)
    {
        $this->authorizePermission($request, 'newsletter.read');

        $query = Newsletter::with(['template', 'organization'])
            ->select([
                'id', 'subject', 'status', 'scheduled_at', 'send_date',
                'sent_at', 'schedule_type', 'total_recipients', 'sent_count',
                'delivered_count', 'opened_count', 'clicked_count',
                'bounced_count', 'unsubscribed_count',
                'newsletter_template_id', 'organization_id', 'created_at',
            ]);

        // Apply search filter
        if ($request->has('search') && ! empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('subject', 'LIKE', "%{$search}%")
                    ->orWhereHas('template', function ($templateQuery) use ($search) {
                        $templateQuery->where('name', 'LIKE', "%{$search}%");
                    })
                    ->orWhereHas('organization', function ($orgQuery) use ($search) {
                        $orgQuery->where('name', 'LIKE', "%{$search}%");
                    });
            });
        }

        // Apply status filter
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $newsletters = $query->latest()->get();

        $filename = 'newsletters_export_'.date('Y-m-d_H-i-s').'.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ];

        $callback = function () use ($newsletters) {
            $file = fopen('php://output', 'w');

            // CSV headers
            fputcsv($file, [
                'ID',
                'Subject',
                'Status',
                'Template',
                'Organization',
                'Total Recipients',
                'Sent Count',
                'Delivered Count',
                'Opened Count',
                'Clicked Count',
                'Bounced Count',
                'Unsubscribed Count',
                'Open Rate (%)',
                'Click Rate (%)',
                'Scheduled At',
                'Sent At',
                'Created At',
            ]);

            foreach ($newsletters as $newsletter) {
                $openRate = $newsletter->total_recipients > 0
                    ? round(($newsletter->opened_count / $newsletter->total_recipients) * 100, 2)
                    : 0;
                $clickRate = $newsletter->total_recipients > 0
                    ? round(($newsletter->clicked_count / $newsletter->total_recipients) * 100, 2)
                    : 0;

                fputcsv($file, [
                    $newsletter->id,
                    $newsletter->subject,
                    $newsletter->status,
                    $newsletter->template->name ?? 'N/A',
                    $newsletter->organization->name ?? 'N/A',
                    $newsletter->total_recipients,
                    $newsletter->sent_count,
                    $newsletter->delivered_count,
                    $newsletter->opened_count,
                    $newsletter->clicked_count,
                    $newsletter->bounced_count,
                    $newsletter->unsubscribed_count,
                    $openRate,
                    $clickRate,
                    $newsletter->scheduled_at ? $newsletter->scheduled_at->format('Y-m-d H:i:s') : 'N/A',
                    $newsletter->sent_at ? $newsletter->sent_at->format('Y-m-d H:i:s') : 'N/A',
                    $newsletter->created_at->format('Y-m-d H:i:s'),
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Show newsletter templates
     */
    public function templates(Request $request): Response
    {
        $this->authorizePermission($request, 'newsletter.read');

        $templates = NewsletterTemplate::with('organization')
            ->select([
                'id', 'name', 'subject', 'template_type', 'is_active',
                'created_at', 'html_content', 'organization_id',
                'frequency_limit', 'custom_frequency_days', 'frequency_notes',
            ])
            ->latest()
            ->paginate(10);

        return Inertia::render('newsletter/templates', [
            'templates' => $templates,
        ]);
    }

    /**
     * Show advanced newsletter creation form
     */
    public function createAdvanced(Request $request): Response
    {
        $this->authorizePermission($request, 'newsletter.create');

        $templates = NewsletterTemplate::where('is_active', true)
            ->select([
                'id', 'name', 'subject', 'content', 'template_type', 'html_content',
                'frequency_limit', 'custom_frequency_days', 'frequency_notes',
            ])
            ->get();

        $authOrg = Organization::forAuthUser($request->user());

        // All approved active nonprofits (includes Care Alliance hubs — “Organizations” means the full directory).
        $careAllianceHubOrgIds = [];
        if (Schema::hasTable('care_alliances') && Schema::hasColumn('care_alliances', 'hub_organization_id')) {
            $careAllianceHubOrgIds = DB::table('care_alliances')
                ->whereNotNull('hub_organization_id')
                ->pluck('hub_organization_id')
                ->map(static fn ($id) => (int) $id)
                ->unique()
                ->values()
                ->all();
        }
        $careAllianceHubOrgIdFlip = array_flip($careAllianceHubOrgIds);

        $organizations = Organization::query()
            ->active()
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'status', 'registration_status'])
            ->map(static function (Organization $o) use ($careAllianceHubOrgIdFlip): array {
                return [
                    'id' => $o->id,
                    'name' => $o->name,
                    'email' => $o->email,
                    'status' => $o->status,
                    'registration_status' => $o->registration_status,
                    'is_care_alliance_hub' => isset($careAllianceHubOrgIdFlip[(int) $o->id]),
                ];
            })
            ->values()
            ->all();

        $mapUserForAdvanced = static function (User $u): array {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'roles' => $u->roles->pluck('name')->values()->all(),
                'email_verified_at' => $u->email_verified_at?->toIso8601String(),
            ];
        };

        $roles = \Spatie\Permission\Models\Role::query()
            ->orderBy('name')
            ->pluck('name')
            ->reject(fn (string $name) => in_array($name, ['organization_pending', 'admin'], true))
            ->values()
            ->all();

        $usersPage = max(1, (int) $request->input('users_page', 1));
        $usersPaginator = User::query()
            ->with('roles')
            ->whereNotNull('email_verified_at')
            ->orderBy('name')
            ->paginate(self::NEWSLETTER_ADVANCED_USERS_PER_PAGE, ['*'], 'users_page', $usersPage);

        $usersChunk = $usersPaginator->getCollection()->map($mapUserForAdvanced)->values()->all();

        $usersMeta = [
            'current_page' => $usersPaginator->currentPage(),
            'last_page' => $usersPaginator->lastPage(),
            'per_page' => $usersPaginator->perPage(),
            'total' => $usersPaginator->total(),
        ];

        if ($authOrg) {
            $audienceScope = 'organization';
            $supportersPage = max(1, (int) $request->input('supporters_page', 1));
            $supporterPaginator = User::query()
                ->role('user')
                ->with('roles')
                ->whereNotNull('email_verified_at')
                ->orderBy('name')
                ->paginate(self::NEWSLETTER_ADVANCED_USERS_PER_PAGE, ['*'], 'supporters_page', $supportersPage);
            $supporterUsers = $supporterPaginator->getCollection()->map($mapUserForAdvanced)->values()->all();
            $supporterUsersMeta = [
                'current_page' => $supporterPaginator->currentPage(),
                'last_page' => $supporterPaginator->lastPage(),
                'per_page' => $supporterPaginator->perPage(),
                'total' => $supporterPaginator->total(),
            ];
        } else {
            $audienceScope = 'platform';
            $supporterUsers = null;
            $supporterUsersMeta = null;
        }

        $previewRolesInput = $request->input('preview_roles', []);
        if (! is_array($previewRolesInput)) {
            $previewRolesInput = [];
        }
        $previewRolesInput = array_values(array_unique(array_filter(
            $previewRolesInput,
            fn ($r) => is_string($r) && $r !== ''
        )));
        $allowedRoleFlip = array_flip($roles);
        $previewRoles = array_values(array_filter(
            $previewRolesInput,
            fn (string $name) => isset($allowedRoleFlip[$name])
        ));

        $roleMatchTotal = null;
        if ($previewRoles !== []) {
            $roleMatchTotal = User::query()
                ->whereNotNull('email_verified_at')
                ->whereHas('roles', function ($q) use ($previewRoles): void {
                    $q->whereIn('name', $previewRoles);
                })
                ->count();
        }

        $stats = [
            'verified_users' => User::query()->whereNotNull('email_verified_at')->count(),
            'supporters' => User::query()->role('user')->whereNotNull('email_verified_at')->count(),
            'role_match_total' => $roleMatchTotal,
        ];

        $user = $request->user();

        $priceUsd = (float) config('newsletter.pro_targeting_lifetime_price_usd', 49);
        $purchaseEnabled = (bool) config('newsletter.pro_targeting_purchase_enabled', true);

        return Inertia::render('newsletter/create-advanced', [
            'templates' => $templates,
            'users' => $usersChunk,
            'users_meta' => $usersMeta,
            'supporter_users' => $supporterUsers,
            'supporter_users_meta' => $supporterUsersMeta,
            'organizations' => $organizations,
            'roles' => $roles,
            'audience_scope' => $audienceScope,
            'related_supporter_count' => $authOrg ? User::query()->role('user')->whereNotNull('email_verified_at')->count() : null,
            'stats' => $stats,
            'has_newsletter_pro_targeting' => $user instanceof User && $this->userCanUseNewsletterProTargeting($user),
            'newsletter_pro_targeting_lifetime_price_usd' => round($priceUsd, 2),
            'newsletter_pro_targeting_purchase_enabled' => $purchaseEnabled && $priceUsd > 0,
        ]);
    }

    /**
     * Create new template
     */
    public function createTemplate(Request $request): Response
    {
        $this->authorizePermission($request, 'newsletter.create');

        return $this->renderNewsletterTemplateForm(null, null);
    }

    /**
     * Whether OPENAI_API_KEY is set (for UI: show AI assistant when true).
     */
    protected function openAiApiKeyIsConfigured(): bool
    {
        $key = config('services.openai.api_key');

        return is_string($key) && trim($key) !== '';
    }

    /**
     * Sample merge-tag preview data for template create/edit pages.
     */
    protected function newsletterTemplatePreviewData(): array
    {
        $user = Auth::user();
        $orgAddress = '';
        if ($user->organization) {
            $addressParts = array_filter([
                $user->organization->street,
                $user->organization->city,
                $user->organization->state,
                $user->organization->zip,
            ]);
            $orgAddress = ! empty($addressParts) ? implode(', ', $addressParts) : 'Your Organization Address';
        }

        return [
            'organization_name' => $user->organization->name ?? ($user->name ?? 'Your Organization'),
            'organization_email' => $user->organization->email ?? ($user->email ?? 'wendhi@stuttiegroup.com'),
            'organization_phone' => $user->organization->phone ?? ($user->contact_number ?? '+1 (555) 000-0000'),
            'organization_address' => $orgAddress ?: 'Your Organization Address',
            'recipient_name' => $user->name ?? 'Recipient Name',
            'recipient_email' => $user->email ?? 'recipient@example.com',
            'current_date' => Carbon::now()->format('F j, Y'),
            'current_year' => (string) Carbon::now()->year,
            'unsubscribe_link' => url('/newsletter/unsubscribe?token=preview_token'),
            'public_view_link' => url('/newsletter/public/preview'),
        ];
    }

    /**
     * @param  array<string, mixed>|null  $templateAiResult
     */
    protected function renderNewsletterTemplateForm(?NewsletterTemplate $template, ?array $templateAiResult): Response
    {
        $props = array_merge([
            'previewData' => $this->newsletterTemplatePreviewData(),
            'openAiConfigured' => $this->openAiApiKeyIsConfigured(),
            'templateAiResult' => $templateAiResult,
        ], $this->newsletterSmsWalletProps());
        if ($template !== null) {
            $props['template'] = $template;
        }

        return Inertia::render('newsletter/template-form', $props);
    }

    /**
     * Generate newsletter template draft (subject, plain text, HTML) from a short brief via OpenAI.
     * Returns Inertia (same page) so the client can use router.post without fetch/axios.
     */
    public function generateTemplateWithAi(Request $request, OpenAiService $openAiService): Response
    {
        $validated = $request->validate([
            'brief' => 'required|string|max:3000',
            'template_type' => 'nullable|in:newsletter,announcement,event',
            'tone' => 'nullable|in:professional,warm,urgent,celebratory',
            'output_mode' => 'required|in:plain,html',
            'send_via' => 'nullable|in:email,sms,both',
            'template_id' => 'nullable|integer|exists:newsletter_templates,id',
        ]);

        $formTemplate = null;
        if (! empty($validated['template_id'])) {
            $this->authorizePermission($request, 'newsletter.edit');
            $formTemplate = NewsletterTemplate::findOrFail((int) $validated['template_id']);
        } else {
            $this->authorizePermission($request, 'newsletter.create');
        }

        if (! $this->openAiApiKeyIsConfigured()) {
            return $this->renderNewsletterTemplateForm($formTemplate, [
                'ok' => false,
                'message' => 'AI is not configured. Set OPENAI_API_KEY on the server.',
                'code' => 'not_configured',
            ]);
        }

        $user = Auth::user();
        $tokensIncluded = (int) ($user->ai_tokens_included ?? 0);
        $tokensUsed = (int) ($user->ai_tokens_used ?? 0);
        if ($tokensIncluded > 0 && $tokensUsed >= $tokensIncluded) {
            return $this->renderNewsletterTemplateForm($formTemplate, [
                'ok' => false,
                'message' => 'You have used all your AI tokens for this period. Upgrade your plan or wait for your next allocation.',
                'code' => 'insufficient_tokens',
            ]);
        }

        $templateType = $validated['template_type'] ?? 'newsletter';
        $tone = $validated['tone'] ?? 'professional';
        $outputMode = $validated['output_mode'];
        $sendVia = $validated['send_via'] ?? 'email';
        if ($sendVia === 'sms') {
            $outputMode = 'plain';
        } elseif ($sendVia === 'both') {
            $outputMode = 'both';
        }

        $typeLabels = [
            'newsletter' => 'a recurring nonprofit / community newsletter',
            'announcement' => 'an important one-off announcement email',
            'event' => 'an event invitation or reminder email',
        ];
        $typeLabel = $typeLabels[$templateType] ?? $typeLabels['newsletter'];

        $mergeVars = $this->newsletterTemplateMergeVarsPromptLine();

        $plainQuality = $sendVia === 'sms'
            ? $this->newsletterAiSmsPlainCopyQualityRules()
            : $this->newsletterAiPlainCopyQualityRules();
        $htmlDesign = $this->newsletterAiHtmlDesignInstructions($tone);

        if ($outputMode === 'plain') {
            $systemPrompt = <<<PROMPT
You help nonprofits write email templates. Respond with ONLY a single JSON object (no markdown fences).
Required keys: "subject" (string), "content" (string), "suggested_name" (string, 2-6 words, title case — this is the internal template name).

PLAIN TEXT OUTPUT ONLY for this request:
- Generate suggested_name, subject, and the full email body as plain text only in "content".
- Do NOT use HTML tags anywhere. Set "html_content" to exactly "" (empty string).

{$plainQuality}

MERGE VARIABLES — STRICT (non-negotiable):
- The ONLY strings that may appear inside single curly braces {…} anywhere in subject or body are exactly: {$mergeVars}
- There are NO other merge fields. Do NOT invent placeholders for stories, blurbs, CTAs, URLs, or “sections”. Forbidden examples (never output these): {impact_story}, {story}, {body}, {main_content}, {cta_link}, {donate_link}, {event_info}, {donor_name}, {first_name}, {date}, or any {word} except those listed above.
- If the brief asks for an impact story, example copy, or event details: write that text in full as normal sentences—no curly braces around it.
- Do NOT use {{name}}, %email%, [FIRST_NAME], or double curly braces. No spaces inside braces (use {organization_name} not { organization_name }).

Subject: compelling, under 200 characters; you may include {organization_name} where it fits.
content: must include the real unsubscribe merge token, e.g. a line "Unsubscribe: {unsubscribe_link}" using exactly {unsubscribe_link}.
Tone: {$tone}, trustworthy for donors and community members.
PROMPT;
        } elseif ($outputMode === 'both') {
            $systemPrompt = <<<PROMPT
You help nonprofits write email templates. Respond with ONLY a single JSON object (no markdown fences).
Required keys: "subject" (string), "content" (string), "html_content" (string), "suggested_name" (string, 2-6 words, title case — this is the internal template name).

DUAL OUTPUT — full professional plain text + HTML email (same campaign):

{$plainQuality}

- "content": Full text/plain MIME body: multi-paragraph, \\n\\n between sections, same narrative as the HTML—not a short SMS-only stub. Typical length when the brief allows: ~150–500+ words for newsletters. No HTML tags. Merge variables only: {$mergeVars}. Include {unsubscribe_link} (and {public_view_link} where appropriate).
- "html_content": Implement the full HTML body following the design specification below (same story and merge-variable rules).

MERGE VARIABLES — STRICT (non-negotiable) in subject, content, and html_content:
- The ONLY strings that may appear inside single curly braces {…} are exactly: {$mergeVars}
- Do NOT use {{name}}, %email%, [NAME], or double curly braces. No spaces inside braces.

{$htmlDesign}
PROMPT;
        } else {
            $systemPrompt = <<<PROMPT
You help nonprofits write email templates. Respond with ONLY a single JSON object (no markdown fences).
Required keys: "subject" (string), "html_content" (string), "content" (string), "suggested_name" (string, 2-6 words, title case — this is the internal template name).

HTML plus plain text (always include both):

{$plainQuality}

- "html_content": full email-safe HTML body implementing the design specification below.
- "content": REQUIRED full plain-text twin for email text/plain part. No HTML tags; line breaks as \\n; merge variables only: {$mergeVars}. Faithfully match the HTML (headlines, sections, CTA, footer). Include {unsubscribe_link}.

MERGE VARIABLES — STRICT (non-negotiable):
- The ONLY strings that may appear inside single curly braces {…} anywhere in subject, html_content, or content are exactly: {$mergeVars}
- There are NO other merge fields. Do NOT invent placeholders for stories, blurbs, CTAs, or URLs. Forbidden examples (never output these): {impact_story}, {story}, {body}, {main_content}, {cta_link}, {donate_link}, {event_info}, {donor_name}, {first_name}, or any {word} except those listed above.
- If the brief asks for an impact story, example copy, or event details: write that as real HTML text (paragraphs, lists)—never as a {placeholder}.
- Do NOT use {{name}}, %email%, [NAME], or double curly braces. No spaces inside braces.

Subject: compelling, under 200 characters; you may include {organization_name} where it fits.

{$htmlDesign}
PROMPT;
        }

        $modeLine = match ($outputMode) {
            'plain' => 'PLAIN TEXT ONLY (no HTML).',
            'both' => 'Full professional plain text in "content" PLUS full HTML in "html_content" (both required).',
            default => 'HTML in "html_content" AND a full plain-text twin in "content" (both required).',
        };
        $userPrompt = "Template purpose: {$typeLabel}.\nOutput mode: {$modeLine}\nDesired tone: {$tone}.\n\nBrief from the user:\n".$validated['brief'];
        if ($outputMode === 'html' || $outputMode === 'both') {
            $userPrompt .= "\n\nMandatory visual requirement: use a distinctive, professional palette with at least one dark or richly colored header, footer, or feature band—not an all-white-only layout. Strong accent, kicker, CTA, section structure.";
        }
        if ($sendVia === 'sms') {
            $userPrompt .= "\n\nHard limit: \"content\" must be at most ".self::NEWSLETTER_SMS_PLAIN_MAX_CHARS.' characters (SMS segment).';
        }

        try {
            $messages = [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $userPrompt],
            ];

            $result = $openAiService->chatCompletionJson($messages);
            $totalTokens = (int) ($result['total_tokens'] ?? 0);

            $decoded = json_decode($result['content'], true);
            if (! is_array($decoded)) {
                return $this->renderNewsletterTemplateForm($formTemplate, [
                    'ok' => false,
                    'message' => 'AI returned an invalid response. Please try again.',
                    'code' => 'invalid_response',
                ]);
            }

            [$subject, $content, $htmlContent, $suggestedName] = $this->normalizeTemplateAiDecodedPayload($decoded, $outputMode);
            if ($sendVia === 'sms') {
                $content = $this->clampNewsletterSmsPlainBody($content);
            }

            $incomplete = $this->templateAiPayloadIsIncomplete($subject, $content, $htmlContent, $suggestedName, $outputMode);
            if ($incomplete !== null) {
                return $this->renderNewsletterTemplateForm($formTemplate, $incomplete);
            }

            $placeholderError = $this->validateTemplateAiMergeVariablesOnly($subject, $content, $htmlContent, $suggestedName);

            if ($placeholderError !== null) {
                $fixPrompt = <<<TXT
Your previous JSON used merge variables that this app does not support. Problem: {$placeholderError}

Return ONE new JSON object with the same keys and the same meaning (same email, same tone), but:
- ONLY these placeholders may appear inside single braces anywhere: {$mergeVars}
- Replace every other {word} with normal written text (full sentences or HTML text). For example use a short example story in plain words instead of {impact_story}; use href="#" and visible button text instead of {cta_link}.
- Keep suggested_name, subject, content, and html_content complete (all keys the same as before). No markdown fences.
TXT;

                $messages[] = ['role' => 'assistant', 'content' => $result['content']];
                $messages[] = ['role' => 'user', 'content' => $fixPrompt];

                $result = $openAiService->chatCompletionJson($messages);
                $totalTokens += (int) ($result['total_tokens'] ?? 0);

                $decoded = json_decode($result['content'], true);
                if (! is_array($decoded)) {
                    return $this->renderNewsletterTemplateForm($formTemplate, [
                        'ok' => false,
                        'message' => 'AI could not fix merge variables. Please try generating again.',
                        'code' => 'invalid_response',
                    ]);
                }

                [$subject, $content, $htmlContent, $suggestedName] = $this->normalizeTemplateAiDecodedPayload($decoded, $outputMode);
                if ($sendVia === 'sms') {
                    $content = $this->clampNewsletterSmsPlainBody($content);
                }

                $incomplete = $this->templateAiPayloadIsIncomplete($subject, $content, $htmlContent, $suggestedName, $outputMode);
                if ($incomplete !== null) {
                    return $this->renderNewsletterTemplateForm($formTemplate, $incomplete);
                }

                $placeholderError = $this->validateTemplateAiMergeVariablesOnly($subject, $content, $htmlContent, $suggestedName);
                if ($placeholderError !== null) {
                    return $this->renderNewsletterTemplateForm($formTemplate, [
                        'ok' => false,
                        'message' => $placeholderError.' Please try generating again.',
                        'code' => 'invalid_placeholders',
                    ]);
                }
            }
            if ($totalTokens > 0) {
                $user->increment('ai_tokens_used', $totalTokens);
            }
            $user->refresh();

            Log::info('Newsletter template AI generated', [
                'user_id' => $user->id,
                'tokens_used' => $totalTokens,
                'ai_tokens_used' => $user->ai_tokens_used,
            ]);

            return $this->renderNewsletterTemplateForm($formTemplate, [
                'ok' => true,
                'output_mode' => $outputMode,
                'subject' => $subject,
                'content' => $content,
                'html_content' => $htmlContent,
                'suggested_name' => $suggestedName,
                'tokens_used' => $totalTokens,
                'ai_tokens_used' => (int) $user->ai_tokens_used,
                'ai_tokens_included' => (int) ($user->ai_tokens_included ?? 0),
            ]);
        } catch (\Exception $e) {
            Log::error('Newsletter template AI generation failed', [
                'message' => $e->getMessage(),
            ]);

            $message = (str_contains($e->getMessage(), 'OpenAI') || str_contains($e->getMessage(), 'API'))
                ? 'AI service error. Check OPENAI_API_KEY and try again.'
                : 'Could not generate template. Please try again.';

            return $this->renderNewsletterTemplateForm($formTemplate, [
                'ok' => false,
                'message' => $message,
                'code' => 'api_error',
            ]);
        }
    }

    /**
     * Generate draft subject + body for the newsletter create page (one send, not a saved template).
     */
    public function generateNewsletterCreateWithAi(Request $request, OpenAiService $openAiService): Response
    {
        $validated = $request->validate([
            'brief' => 'required|string|max:3000',
            'template_type' => 'nullable|in:newsletter,announcement,event',
            'tone' => 'nullable|in:professional,warm,urgent,celebratory',
            'output_mode' => 'required|in:plain,html',
            'send_via' => 'nullable|in:email,sms,both',
        ]);

        $this->authorizePermission($request, 'newsletter.create');

        if (! $this->openAiApiKeyIsConfigured()) {
            return Inertia::render('newsletter/create', $this->newsletterCreatePageData([
                'ok' => false,
                'message' => 'AI is not configured. Set OPENAI_API_KEY on the server.',
                'code' => 'not_configured',
            ]));
        }

        $user = Auth::user();
        $tokensIncluded = (int) ($user->ai_tokens_included ?? 0);
        $tokensUsed = (int) ($user->ai_tokens_used ?? 0);
        if ($tokensIncluded > 0 && $tokensUsed >= $tokensIncluded) {
            return Inertia::render('newsletter/create', $this->newsletterCreatePageData([
                'ok' => false,
                'message' => 'You have used all your AI tokens for this period. Upgrade your plan or wait for your next allocation.',
                'code' => 'insufficient_tokens',
            ]));
        }

        $templateType = $validated['template_type'] ?? 'newsletter';
        $tone = $validated['tone'] ?? 'professional';
        $outputMode = $validated['output_mode'];
        $sendVia = $validated['send_via'] ?? 'email';
        if ($sendVia === 'sms') {
            $outputMode = 'plain';
        } elseif ($sendVia === 'both') {
            $outputMode = 'both';
        }

        $typeLabels = [
            'newsletter' => 'a recurring nonprofit / community newsletter send',
            'announcement' => 'an important one-off announcement email send',
            'event' => 'an event invitation or reminder email send',
        ];
        $typeLabel = $typeLabels[$templateType] ?? $typeLabels['newsletter'];

        $mergeVars = $this->newsletterTemplateMergeVarsPromptLine();
        $plainQuality = $sendVia === 'sms'
            ? $this->newsletterAiSmsPlainCopyQualityRules()
            : $this->newsletterAiPlainCopyQualityRules();
        $htmlDesign = $this->newsletterAiHtmlDesignInstructions($tone);

        if ($outputMode === 'plain') {
            $systemPrompt = <<<PROMPT
You help nonprofits write email campaigns. Respond with ONLY a single JSON object (no markdown fences).
Required keys: "subject" (string), "content" (string).

PLAIN TEXT OUTPUT ONLY for this request:
- Generate subject and the full email body as plain text only in "content".
- Do NOT use HTML tags anywhere. Set "html_content" to exactly "" (empty string).

This is for a single newsletter send (not a reusable template). Do not include a template name field.

{$plainQuality}

MERGE VARIABLES — STRICT (non-negotiable):
- The ONLY strings that may appear inside single curly braces {…} anywhere in subject or body are exactly: {$mergeVars}
- There are NO other merge fields. Do NOT invent placeholders for stories, blurbs, CTAs, URLs, or “sections”. Forbidden examples (never output these): {impact_story}, {story}, {body}, {main_content}, {cta_link}, {donate_link}, {event_info}, {donor_name}, {first_name}, {date}, or any {word} except those listed above.
- If the brief asks for an impact story, example copy, or event details: write that text in full as normal sentences—no curly braces around it.
- Do NOT use {{name}}, %email%, [FIRST_NAME], or double curly braces. No spaces inside braces (use {organization_name} not { organization_name }).

Subject: compelling, under 200 characters; you may include {organization_name} where it fits.
content: must include {unsubscribe_link}; you may include {public_view_link} where a browser view link is appropriate.
Tone: {$tone}, trustworthy for donors and community members.
PROMPT;
        } elseif ($outputMode === 'both') {
            $systemPrompt = <<<PROMPT
You help nonprofits write email campaigns. Respond with ONLY a single JSON object (no markdown fences).
Required keys: "subject" (string), "content" (string), "html_content" (string).

DUAL OUTPUT — full professional plain text + HTML for one send:

{$plainQuality}

- "content": Full text/plain body: multi-paragraph, \\n\\n between sections, same narrative as the HTML—not a short SMS-only blurb. Typical length when the brief allows: ~150–500+ words. No HTML tags. Merge variables only: {$mergeVars}. Include {unsubscribe_link} and {public_view_link} where appropriate.
- "html_content": Full email-safe HTML implementing the design specification below.

MERGE VARIABLES — STRICT in subject, content, and html_content:
- The ONLY strings inside single curly braces {…} are exactly: {$mergeVars}
- Do NOT use {{name}}, %email%, [NAME], or double curly braces.

{$htmlDesign}
PROMPT;
        } else {
            $systemPrompt = <<<PROMPT
You help nonprofits write email campaigns. Respond with ONLY a single JSON object (no markdown fences).
Required keys: "subject" (string), "html_content" (string), "content" (string).

HTML plus plain text (always include both):

{$plainQuality}

- "html_content": full email-safe HTML body implementing the design specification below.
- "content": REQUIRED full plain-text twin (no HTML tags, \\n line breaks). Merge variables only: {$mergeVars}. Include {unsubscribe_link} and optionally {public_view_link}. Faithfully match the HTML.

This is for a single newsletter send (not a reusable template). Do not include a template name field.

MERGE VARIABLES — STRICT (non-negotiable):
- The ONLY strings that may appear inside single curly braces {…} anywhere in subject, html_content, or content are exactly: {$mergeVars}
- There are NO other merge fields. Do NOT invent placeholders for stories, blurbs, CTAs, or URLs. Forbidden examples (never output these): {impact_story}, {story}, {body}, {main_content}, {cta_link}, {donate_link}, {event_info}, {donor_name}, {first_name}, or any {word} except those listed above.
- If the brief asks for an impact story, example copy, or event details: write that as real HTML text (paragraphs, lists)—never as a {placeholder}.
- Do NOT use {{name}}, %email%, [NAME], or double curly braces. No spaces inside braces.

Subject: compelling, under 200 characters; you may include {organization_name} where it fits.

{$htmlDesign}
PROMPT;
        }

        $modeLine = match ($outputMode) {
            'plain' => 'PLAIN TEXT ONLY (no HTML).',
            'both' => 'Full professional plain text in "content" PLUS full HTML in "html_content" (both required).',
            default => 'HTML in "html_content" AND a full plain-text twin in "content" (both required).',
        };
        $userPrompt = "Campaign purpose: {$typeLabel}.\nOutput mode: {$modeLine}\nDesired tone: {$tone}.\n\nBrief from the user:\n".$validated['brief'];
        if ($outputMode === 'html' || $outputMode === 'both') {
            $userPrompt .= "\n\nMandatory: HTML must use a distinctive palette with at least one dark or richly colored header, footer, or feature band—not an all-white-only layout.";
        }
        if ($sendVia === 'sms') {
            $userPrompt .= "\n\nHard limit: \"content\" must be at most ".self::NEWSLETTER_SMS_PLAIN_MAX_CHARS.' characters (SMS segment).';
        }

        try {
            $messages = [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $userPrompt],
            ];

            $result = $openAiService->chatCompletionJson($messages);
            $totalTokens = (int) ($result['total_tokens'] ?? 0);

            $decoded = json_decode($result['content'], true);
            if (! is_array($decoded)) {
                return Inertia::render('newsletter/create', $this->newsletterCreatePageData([
                    'ok' => false,
                    'message' => 'AI returned an invalid response. Please try again.',
                    'code' => 'invalid_response',
                ]));
            }

            [$subject, $content, $htmlContent] = $this->normalizeNewsletterCreateAiDecodedPayload($decoded, $outputMode);
            if ($sendVia === 'sms') {
                $content = $this->clampNewsletterSmsPlainBody($content);
            }

            $incomplete = $this->newsletterCreateAiPayloadIsIncomplete($subject, $content, $htmlContent, $outputMode);
            if ($incomplete !== null) {
                return Inertia::render('newsletter/create', $this->newsletterCreatePageData($incomplete));
            }

            $placeholderError = $this->validateTemplateAiMergeVariablesOnly($subject, $content, $htmlContent, '');

            if ($placeholderError !== null) {
                $fixPrompt = <<<TXT
Your previous JSON used merge variables that this app does not support. Problem: {$placeholderError}

Return ONE new JSON object with the same keys and the same meaning (same email, same tone), but:
- ONLY these placeholders may appear inside single braces anywhere: {$mergeVars}
- Replace every other {word} with normal written text (full sentences or HTML text). For example use a short example story in plain words instead of {impact_story}; use href="#" and visible button text instead of {cta_link}.
- Keep subject, content, and html_content complete (same keys as before). No markdown fences.
TXT;

                $messages[] = ['role' => 'assistant', 'content' => $result['content']];
                $messages[] = ['role' => 'user', 'content' => $fixPrompt];

                $result = $openAiService->chatCompletionJson($messages);
                $totalTokens += (int) ($result['total_tokens'] ?? 0);

                $decoded = json_decode($result['content'], true);
                if (! is_array($decoded)) {
                    return Inertia::render('newsletter/create', $this->newsletterCreatePageData([
                        'ok' => false,
                        'message' => 'AI could not fix merge variables. Please try generating again.',
                        'code' => 'invalid_response',
                    ]));
                }

                [$subject, $content, $htmlContent] = $this->normalizeNewsletterCreateAiDecodedPayload($decoded, $outputMode);
                if ($sendVia === 'sms') {
                    $content = $this->clampNewsletterSmsPlainBody($content);
                }

                $incomplete = $this->newsletterCreateAiPayloadIsIncomplete($subject, $content, $htmlContent, $outputMode);
                if ($incomplete !== null) {
                    return Inertia::render('newsletter/create', $this->newsletterCreatePageData($incomplete));
                }

                $placeholderError = $this->validateTemplateAiMergeVariablesOnly($subject, $content, $htmlContent, '');
                if ($placeholderError !== null) {
                    return Inertia::render('newsletter/create', $this->newsletterCreatePageData([
                        'ok' => false,
                        'message' => $placeholderError.' Please try generating again.',
                        'code' => 'invalid_placeholders',
                    ]));
                }
            }
            if ($totalTokens > 0) {
                $user->increment('ai_tokens_used', $totalTokens);
            }
            $user->refresh();

            Log::info('Newsletter create AI generated', [
                'user_id' => $user->id,
                'tokens_used' => $totalTokens,
                'ai_tokens_used' => $user->ai_tokens_used,
            ]);

            return Inertia::render('newsletter/create', $this->newsletterCreatePageData([
                'ok' => true,
                'output_mode' => $outputMode,
                'subject' => $subject,
                'content' => $content,
                'html_content' => $htmlContent,
                'tokens_used' => $totalTokens,
                'ai_tokens_used' => (int) $user->ai_tokens_used,
                'ai_tokens_included' => (int) ($user->ai_tokens_included ?? 0),
            ]));
        } catch (\Exception $e) {
            Log::error('Newsletter create AI generation failed', [
                'message' => $e->getMessage(),
            ]);

            $message = (str_contains($e->getMessage(), 'OpenAI') || str_contains($e->getMessage(), 'API'))
                ? 'AI service error. Check OPENAI_API_KEY and try again.'
                : 'Could not generate draft. Please try again.';

            return Inertia::render('newsletter/create', $this->newsletterCreatePageData([
                'ok' => false,
                'message' => $message,
                'code' => 'api_error',
            ]));
        }
    }

    /**
     * Store new template
     */
    public function storeTemplate(Request $request)
    {
        $this->authorizePermission($request, 'newsletter.create');

        $request->validate([
            'name' => 'required|string|max:255',
            'subject' => 'required|string|max:255',
            'content' => 'nullable|string',
            'html_content' => 'nullable|string',
            'template_type' => 'required|in:newsletter,announcement,event',
            'settings' => 'nullable|array',
        ]);

        $contentTrim = trim((string) $request->content);
        $htmlTrim = trim((string) $request->html_content);
        if ($contentTrim === '' && $htmlTrim === '') {
            throw ValidationException::withMessages([
                'content' => 'Provide plain text content and/or HTML content.',
                'html_content' => 'Provide plain text content and/or HTML content.',
            ]);
        }

        $template = NewsletterTemplate::create([
            'organization_id' => null,
            'name' => $request->name,
            'subject' => $request->subject,
            'content' => $contentTrim === '' ? '' : $request->content,
            'html_content' => $htmlTrim === '' ? null : $request->html_content,
            'template_type' => $request->template_type,
            'settings' => $request->settings ?? [],
            'is_active' => true,
        ]);

        return redirect()->route('newsletter.templates')
            ->with('success', 'Template created successfully!');
    }

    /**
     * Show template details
     */
    public function showTemplate(Request $request, $id): Response
    {
        $this->authorizePermission($request, 'newsletter.read');

        $template = NewsletterTemplate::with('organization')->findOrFail($id);

        return Inertia::render('newsletter/template-show', [
            'template' => $template,
        ]);
    }

    /**
     * Edit template
     */
    public function editTemplate(Request $request, $id): Response
    {
        $this->authorizePermission($request, 'newsletter.edit');

        $template = NewsletterTemplate::findOrFail($id);

        return $this->renderNewsletterTemplateForm($template, null);
    }

    /**
     * Update template
     */
    public function updateTemplate(Request $request, $id)
    {
        $this->authorizePermission($request, 'newsletter.edit');

        $request->validate([
            'name' => 'required|string|max:255',
            'subject' => 'required|string|max:255',
            'content' => 'nullable|string',
            'html_content' => 'nullable|string',
            'template_type' => 'required|in:newsletter,announcement,event',
            'settings' => 'nullable|array',
        ]);

        $contentTrim = trim((string) $request->content);
        $htmlTrim = trim((string) $request->html_content);
        if ($contentTrim === '' && $htmlTrim === '') {
            throw ValidationException::withMessages([
                'content' => 'Provide plain text content and/or HTML content.',
                'html_content' => 'Provide plain text content and/or HTML content.',
            ]);
        }

        $template = NewsletterTemplate::findOrFail($id);

        $template->update([
            'name' => $request->name,
            'subject' => $request->subject,
            'content' => $contentTrim === '' ? '' : $request->content,
            'html_content' => $htmlTrim === '' ? null : $request->html_content,
            'template_type' => $request->template_type,
            'settings' => $request->settings ?? $template->settings,
        ]);

        return redirect()->route('newsletter.templates')
            ->with('success', 'Template updated successfully!');
    }

    /**
     * Delete template
     */
    public function destroyTemplate(Request $request, $id)
    {
        $this->authorizePermission($request, 'newsletter.delete');

        $template = NewsletterTemplate::findOrFail($id);

        // Check if template is being used by any newsletters
        $newsletterCount = $template->newsletters()->count();
        if ($newsletterCount > 0) {
            return back()->with('error', "Cannot delete template. It's being used by {$newsletterCount} newsletter(s).");
        }

        $template->delete();

        return redirect()->route('newsletter.templates')
            ->with('success', 'Template deleted successfully!');
    }

    /**
     * Show recipients
     */
    public function recipients(Request $request): Response
    {
        $this->authorizePermission($request, 'newsletter.read');

        $search = $request->input('search', '');
        $statusFilter = $request->input('status_filter', 'all');

        $organizationsQuery = $this->newsletterRecipientsOrganizationsQuery();

        // Apply search filter
        if (! empty($search) && trim($search) !== '') {
            $organizationsQuery->where(function ($query) use ($search) {
                $query->where('name', 'LIKE', "%{$search}%")
                    ->orWhere('email', 'LIKE', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('name', 'LIKE', "%{$search}%")
                            ->orWhere('email', 'LIKE', "%{$search}%");
                    });
            });
        }

        // Apply status filter
        if ($statusFilter && $statusFilter !== 'all') {
            if ($statusFilter === 'subscribed') {
                $organizationsQuery->whereHas('newsletterRecipients', function ($query) {
                    $query->where('status', 'active');
                });
            } elseif ($statusFilter === 'not_subscribed') {
                $organizationsQuery->whereDoesntHave('newsletterRecipients');
            } elseif ($statusFilter === 'unsubscribed') {
                $organizationsQuery->whereHas('newsletterRecipients', function ($query) {
                    $query->where('status', 'unsubscribed');
                });
            } elseif ($statusFilter === 'bounced') {
                $organizationsQuery->whereHas('newsletterRecipients', function ($query) {
                    $query->where('status', 'bounced');
                });
            }
        }

        $organizations = $organizationsQuery->latest()->paginate(20);

        $approvedOrgIds = Organization::query()->active()->excludingCareAllianceHubs()->pluck('id');

        $totalOrganizations = $approvedOrgIds->count();
        $activeSubscriptions = NewsletterRecipient::active()->whereIn('organization_id', $approvedOrgIds)->count();
        $unsubscribed = NewsletterRecipient::unsubscribed()->whereIn('organization_id', $approvedOrgIds)->count();
        $bounced = NewsletterRecipient::bounced()->whereIn('organization_id', $approvedOrgIds)->count();

        $notSubscribed = Organization::query()
            ->active()
            ->excludingCareAllianceHubs()
            ->whereDoesntHave('newsletterRecipients')
            ->count();

        $stats = [
            'total_organizations' => $totalOrganizations,
            'active_subscriptions' => $activeSubscriptions,
            'unsubscribed' => $unsubscribed,
            'bounced' => $bounced,
            'not_subscribed' => $notSubscribed,
        ];

        // Get manual recipients (not associated with organizations) with pagination
        $manualRecipientsQuery = NewsletterRecipient::whereNull('organization_id');

        // Apply search filter for manual recipients
        $manualSearch = $request->input('manual_search', '');
        if (! empty($manualSearch) && trim($manualSearch) !== '') {
            $manualRecipientsQuery->where(function ($query) use ($manualSearch) {
                $query->where('email', 'LIKE', "%{$manualSearch}%")
                    ->orWhere('name', 'LIKE', "%{$manualSearch}%");
            });
        }

        $manualRecipients = $manualRecipientsQuery->latest()->paginate(10);

        return Inertia::render('newsletter/recipients', [
            'organizations' => $organizations,
            'manualRecipients' => $manualRecipients,
            'stats' => $stats,
            'search' => $search,
            'statusFilter' => $statusFilter,
            'manualSearch' => $manualSearch,
        ]);
    }

    /**
     * Store new recipient
     */
    public function storeRecipient(Request $request)
    {
        $this->authorizePermission($request, 'newsletter.create');

        $request->validate([
            'email' => 'required|email|max:255',
            'name' => 'nullable|string|max:255',
        ]);

        // Check if recipient already exists
        $existingRecipient = NewsletterRecipient::where('email', $request->email)->first();

        if ($existingRecipient) {
            return back()->with('error', 'This email is already subscribed to the newsletter.');
        }

        NewsletterRecipient::create([
            'organization_id' => null,
            'email' => $request->email,
            'name' => $request->name,
            'status' => 'active',
            'subscribed_at' => now(),
        ]);

        return back()->with('success', 'Recipient added successfully!');
    }

    /**
     * Subscribe organization to newsletter
     */
    public function subscribeOrganization(Request $request, $organizationId)
    {
        $this->authorizePermission($request, 'newsletter.create');

        $organization = Organization::findOrFail($organizationId);

        // Check if already has an active subscription
        $existingRecipient = NewsletterRecipient::where('email', $organization->email)->first();

        if ($existingRecipient && $existingRecipient->status === 'active') {
            return back()->with('error', 'This organization is already subscribed to the newsletter.');
        }

        if ($existingRecipient) {
            // Update existing recipient to active
            $existingRecipient->update([
                'status' => 'active',
                'subscribed_at' => now(),
                'unsubscribed_at' => null,
            ]);
        } else {
            // Create new recipient
            NewsletterRecipient::create([
                'organization_id' => $organization->id,
                'email' => $organization->email,
                'name' => $organization->user->name ?? $organization->name,
                'status' => 'active',
                'subscribed_at' => now(),
            ]);
        }

        return back()->with('success', 'Organization subscribed successfully!');
    }

    /**
     * Unsubscribe organization from newsletter
     */
    public function unsubscribeOrganization(Request $request, $organizationId)
    {
        $this->authorizePermission($request, 'newsletter.edit');

        $organization = Organization::findOrFail($organizationId);

        // Find and update the recipient status
        $recipient = NewsletterRecipient::where('organization_id', $organization->id)
            ->orWhere('email', $organization->email)
            ->first();

        if ($recipient) {
            $recipient->update([
                'status' => 'unsubscribed',
                'unsubscribed_at' => now(),
            ]);

            return back()->with('success', 'Organization unsubscribed successfully!');
        }

        return back()->with('error', 'Organization is not subscribed to the newsletter.');
    }

    /**
     * Send test email
     */
    public function sendTestEmail(Request $request)
    {
        $this->authorizePermission($request, 'newsletter.send');

        $request->validate([
            'email' => 'required|email',
            'subject' => 'required|string',
            'content' => 'required|string',
        ]);

        try {
            // Send test email
            Mail::raw($request->content, function ($message) use ($request) {
                $message->to($request->email)
                    ->subject('[TEST] '.$request->subject)
                    ->from(config('mail.from.address'), config('mail.from.name'));
            });

            Log::info('Test email sent', [
                'to' => $request->email,
                'subject' => $request->subject,
                'sent_by' => Auth::id(),
            ]);

            return back()->with('success', 'Test email sent successfully to '.$request->email.'!');
        } catch (\Exception $e) {
            Log::error('Test email failed', [
                'to' => $request->email,
                'error' => $e->getMessage(),
            ]);

            return back()->with('error', 'Failed to send test email: '.$e->getMessage());
        }
    }

    /**
     * Export recipients
     */
    public function exportRecipients(Request $request)
    {
        $this->authorizePermission($request, 'newsletter.read');

        $search = $request->input('search', '');
        $statusFilter = $request->input('status_filter', 'all');

        $organizationsQuery = $this->newsletterRecipientsOrganizationsQuery();

        // Apply search filter
        if (! empty($search) && trim($search) !== '') {
            $organizationsQuery->where(function ($query) use ($search) {
                $query->where('name', 'LIKE', "%{$search}%")
                    ->orWhere('email', 'LIKE', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('name', 'LIKE', "%{$search}%")
                            ->orWhere('email', 'LIKE', "%{$search}%");
                    });
            });
        }

        // Apply status filter
        if ($statusFilter && $statusFilter !== 'all') {
            if ($statusFilter === 'subscribed') {
                $organizationsQuery->whereHas('newsletterRecipients', function ($query) {
                    $query->where('status', 'active');
                });
            } elseif ($statusFilter === 'not_subscribed') {
                $organizationsQuery->whereDoesntHave('newsletterRecipients');
            } elseif ($statusFilter === 'unsubscribed') {
                $organizationsQuery->whereHas('newsletterRecipients', function ($query) {
                    $query->where('status', 'unsubscribed');
                });
            } elseif ($statusFilter === 'bounced') {
                $organizationsQuery->whereHas('newsletterRecipients', function ($query) {
                    $query->where('status', 'bounced');
                });
            }
        }

        $organizations = $organizationsQuery->get();

        $filename = 'newsletter_recipients_'.date('Y-m-d_H-i-s').'.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ];

        $callback = function () use ($organizations) {
            $file = fopen('php://output', 'w');

            // CSV headers
            fputcsv($file, [
                'Organization Name',
                'Organization Email',
                'Contact Person',
                'Contact Email',
                'Registration Status',
                'Newsletter Status',
                'Subscribed Date',
                'Created Date',
            ]);

            foreach ($organizations as $org) {
                $subscription = $org->newsletterRecipients?->first();
                $subscriptionStatus = $subscription?->status ?? 'not_subscribed';

                fputcsv($file, [
                    $org->name,
                    $org->email,
                    $org->user?->name ?? 'N/A',
                    $org->user?->email ?? 'N/A',
                    $org->registration_status,
                    $subscriptionStatus,
                    $subscription?->subscribed_at ? date('Y-m-d H:i:s', strtotime($subscription->subscribed_at)) : 'N/A',
                    date('Y-m-d H:i:s', strtotime($org->created_at)),
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Import recipients from CSV
     */
    public function importRecipients(Request $request)
    {
        $this->authorizePermission($request, 'newsletter.create');

        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:2048',
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();

        $imported = 0;
        $errors = [];

        if (($handle = fopen($path, 'r')) !== false) {
            // Skip header row
            fgetcsv($handle);

            while (($data = fgetcsv($handle, 1000, ',')) !== false) {
                if (count($data) >= 2) {
                    $email = trim($data[0]);
                    $name = isset($data[1]) ? trim($data[1]) : null;

                    if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
                        // Check if recipient already exists
                        $existing = NewsletterRecipient::where('email', $email)->first();

                        if (! $existing) {
                            NewsletterRecipient::create([
                                'organization_id' => null,
                                'email' => $email,
                                'name' => $name,
                                'status' => 'active',
                                'subscribed_at' => now(),
                            ]);
                            $imported++;
                        } else {
                            $errors[] = "Email {$email} already exists";
                        }
                    } else {
                        $errors[] = "Invalid email: {$email}";
                    }
                }
            }
            fclose($handle);
        }

        $message = "Successfully imported {$imported} recipients.";
        if (! empty($errors)) {
            $message .= ' Errors: '.implode(', ', array_slice($errors, 0, 5));
            if (count($errors) > 5) {
                $message .= ' and '.(count($errors) - 5).' more errors.';
            }
        }

        return back()->with('success', $message);
    }

    /**
     * Subscribe manual recipient
     */
    public function subscribeManualRecipient(Request $request, $recipientId)
    {
        $this->authorizePermission($request, 'newsletter.create');

        $recipient = NewsletterRecipient::findOrFail($recipientId);

        if ($recipient->status === 'active') {
            return back()->with('error', 'This recipient is already subscribed.');
        }

        $recipient->update([
            'status' => 'active',
            'subscribed_at' => now(),
            'unsubscribed_at' => null,
        ]);

        return back()->with('success', 'Recipient subscribed successfully!');
    }

    /**
     * Unsubscribe manual recipient
     */
    public function unsubscribeManualRecipient(Request $request, $recipientId)
    {
        $this->authorizePermission($request, 'newsletter.edit');

        $recipient = NewsletterRecipient::findOrFail($recipientId);

        if ($recipient->status !== 'active') {
            return back()->with('error', 'This recipient is not currently subscribed.');
        }

        $recipient->update([
            'status' => 'unsubscribed',
            'unsubscribed_at' => now(),
        ]);

        return back()->with('success', 'Recipient unsubscribed successfully!');
    }

    /**
     * Create new newsletter
     */
    public function create(Request $request): Response
    {
        $this->authorizePermission($request, 'newsletter.create');

        return Inertia::render('newsletter/create', $this->newsletterCreatePageData(null));
    }

    /**
     * Store new newsletter
     */
    public function store(Request $request)
    {
        $this->authorizePermission($request, 'newsletter.create');

        // Debug the request data
        Log::info('Newsletter store request data:', [
            'send_date' => $request->send_date,
            'schedule_type' => $request->schedule_type,
            'user_timezone' => config('app.timezone'),
            'browser_timezone' => $request->header('X-Timezone'),
            'all_data' => $request->all(),
        ]);

        // Custom validation for send_date based on schedule_type
        $rules = [
            'newsletter_template_id' => 'required|exists:newsletter_templates,id',
            'subject' => 'required|string|max:255',
            'content' => $request->input('send_via') === 'sms'
                ? 'required|string|max:'.self::NEWSLETTER_SMS_PLAIN_MAX_CHARS
                : 'nullable|string',
            'html_content' => 'nullable|string',
            'send_via' => 'required|in:email,sms,both',
            'scheduled_at' => 'nullable|date|after:now',
            'schedule_type' => 'required|in:immediate,scheduled,recurring',
            'recurring_settings' => 'nullable|array',
            'target_type' => 'required|in:all,users,organizations,specific,roles',
            'target_users' => 'nullable|array',
            'target_organizations' => 'nullable|array',
            'target_roles' => 'nullable|array',
            'target_criteria' => 'nullable|array',
            'is_public' => 'boolean',
        ];

        // Add send_date validation based on schedule_type
        // Note: We allow past dates since late newsletters will be sent immediately
        if ($request->schedule_type === 'scheduled' || $request->schedule_type === 'recurring') {
            $rules['send_date'] = 'required|date';
        } else {
            $rules['send_date'] = 'nullable|date';
        }

        // Custom validation to check date in user's timezone context
        // We removed 'after_or_equal:now' to allow past dates (late newsletters will be sent immediately)
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), $rules);

        // Add custom validation for send_date - Carbon automatically uses config('app.timezone')
        $validator->after(function ($validator) use ($request) {
            if ($request->input('target_type') === 'roles') {
                $roles = $request->input('target_roles', []);
                if (! is_array($roles) || $roles === [] || ! collect($roles)->filter(fn ($r) => is_string($r) && $r !== '')->isNotEmpty()) {
                    $validator->errors()->add('target_roles', 'Select at least one role to send to those users.');
                }
            }

            $targetType = $request->input('target_type');
            if (in_array($targetType, ['organizations', 'specific', 'roles'], true)) {
                $u = $request->user();
                if ($u instanceof User && ! $this->userCanUseNewsletterProTargeting($u)) {
                    $validator->errors()->add(
                        'target_type',
                        'By role, Organizations, and Custom targeting require the Pro newsletter targeting purchase (or admin access).'
                    );
                }
            }

            if (($request->schedule_type === 'scheduled' || $request->schedule_type === 'recurring') && $request->send_date) {
                try {
                    // Carbon automatically uses config('app.timezone') set by middleware
                    $sendDate = Carbon::parse($request->send_date);
                    $now = Carbon::now();

                    // Allow past dates (late newsletters will be sent immediately)
                    // But warn if it's more than 24 hours in the past
                    if ($sendDate->lt($now->copy()->subDay())) {
                        // More than 24 hours late - might be a mistake, but allow it
                        Log::warning('Newsletter scheduled for more than 24 hours in the past', [
                            'send_date' => $sendDate->toDateTimeString(),
                            'current_time' => $now->toDateTimeString(),
                            'timezone' => config('app.timezone'),
                        ]);
                    }
                } catch (\Exception $e) {
                    $validator->errors()->add('send_date', 'Invalid date format.');
                }
            }
        });

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        $sendVia = $request->input('send_via', 'email');
        $contentTrim = trim((string) $request->content);
        $htmlTrim = trim((string) $request->html_content);

        if ($sendVia === 'sms') {
            if ($contentTrim === '') {
                throw ValidationException::withMessages([
                    'content' => 'Plain text content is required for SMS.',
                ]);
            }
            $htmlTrim = '';
        } elseif ($sendVia === 'both') {
            if ($contentTrim === '') {
                throw ValidationException::withMessages([
                    'content' => 'Plain text content is required for the SMS leg of this send.',
                ]);
            }
            if ($htmlTrim === '') {
                throw ValidationException::withMessages([
                    'html_content' => 'HTML content is required when sending both SMS and email (email uses the HTML version).',
                ]);
            }
        } elseif ($contentTrim === '' && $htmlTrim === '') {
            throw ValidationException::withMessages([
                'content' => 'Provide plain text content and/or HTML content.',
                'html_content' => 'Provide plain text content and/or HTML content.',
            ]);
        }

        $template = NewsletterTemplate::findOrFail($request->newsletter_template_id);

        // Calculate send date based on schedule type
        $sendDate = null;
        $status = 'draft';

        // Get user's timezone (set by middleware)
        $userTimezone = config('app.timezone', 'UTC');

        switch ($request->schedule_type) {
            case 'immediate':
                $status = 'draft';
                $sendDate = null;
                break;
            case 'scheduled':
                // Parse date explicitly in user's timezone, then convert to UTC for storage
                if ($request->send_date) {
                    // Create Carbon instance in user's timezone, then convert to UTC
                    $sendDate = Carbon::createFromFormat('Y-m-d\TH:i', $request->send_date, $userTimezone)->utc();
                } else {
                    $sendDate = null;
                }
                $status = 'scheduled';
                break;
            case 'recurring':
                // Parse date explicitly in user's timezone, then convert to UTC for storage
                if ($request->send_date) {
                    $sendDate = Carbon::createFromFormat('Y-m-d\TH:i', $request->send_date, $userTimezone)->utc();
                } else {
                    $sendDate = null;
                }
                $status = 'scheduled';
                break;
        }

        // Get authenticated user and their organization
        $user = Auth::user();
        $userOrganization = Organization::forAuthUser($user);

        // Get target recipients count
        $newsletter = new Newsletter([
            'organization_id' => $userOrganization->id ?? null,
            'newsletter_template_id' => $request->newsletter_template_id,
            'subject' => $request->subject,
            'content' => $contentTrim === '' ? '' : $request->content,
            'html_content' => $htmlTrim === '' ? null : $request->html_content,
            'send_via' => $sendVia,
            'status' => $status,
            'scheduled_at' => $sendDate, // Use send_date for scheduled_at as well for compatibility
            'send_date' => $sendDate,
            'schedule_type' => $request->schedule_type,
            'recurring_settings' => $request->recurring_settings,
            'target_type' => $request->target_type,
            'target_users' => $request->target_users,
            'target_organizations' => $request->target_organizations,
            'target_roles' => $request->target_roles,
            'target_criteria' => $request->target_criteria,
            'is_public' => $request->is_public ?? false,
        ]);

        // Calculate total recipients
        $newsletter->total_recipients = $newsletter->getTargetedUsers()->count();
        $newsletter->save();

        return redirect()->route('newsletter.show', $newsletter->id)
            ->with('success', 'Newsletter created successfully!');
    }

    /**
     * Show newsletter details
     */
    public function show(Request $request, $id): Response
    {
        $this->authorizePermission($request, 'newsletter.read');

        $newsletter = Newsletter::with(['template', 'organization', 'emails.recipient'])
            ->select([
                'id', 'subject', 'content', 'html_content', 'send_via', 'status',
                'scheduled_at', 'send_date', 'sent_at', 'schedule_type',
                'total_recipients', 'sent_count', 'delivered_count',
                'opened_count', 'clicked_count', 'bounced_count',
                'unsubscribed_count', 'newsletter_template_id', 'organization_id',
                'created_at', 'updated_at',
            ])
            ->findOrFail($id);

        // Format all dates - Convert from UTC (database) to user's timezone
        $userTimezone = config('app.timezone', 'UTC');

        if ($newsletter->scheduled_at) {
            // Get raw UTC value from database - Laravel stores as UTC string
            $rawValue = $newsletter->getRawOriginal('scheduled_at') ?? $newsletter->scheduled_at;
            $date = Carbon::parse($rawValue, 'UTC')->setTimezone($userTimezone);
            $newsletter->scheduled_at_formatted = $date->format('M d, Y h:i A');
            $newsletter->scheduled_at_iso = $date->toISOString();
        }
        if ($newsletter->send_date) {
            // Get raw UTC value from database
            $rawValue = $newsletter->getRawOriginal('send_date') ?? $newsletter->send_date;
            $date = Carbon::parse($rawValue, 'UTC')->setTimezone($userTimezone);
            $newsletter->send_date_formatted = $date->format('M d, Y h:i A');
            $newsletter->send_date_iso = $date->toISOString();
        }
        if ($newsletter->sent_at) {
            $rawValue = $newsletter->getRawOriginal('sent_at') ?? $newsletter->sent_at;
            $date = Carbon::parse($rawValue, 'UTC')->setTimezone($userTimezone);
            $newsletter->sent_at_formatted = $date->format('M d, Y h:i A');
        }
        if ($newsletter->created_at) {
            $rawValue = $newsletter->getRawOriginal('created_at') ?? $newsletter->created_at;
            $date = Carbon::parse($rawValue, 'UTC')->setTimezone($userTimezone);
            $newsletter->created_at_formatted = $date->format('M d, Y h:i A');
        }

        // Format email dates
        $newsletter->emails->transform(function ($email) use ($userTimezone) {
            if ($email->sent_at) {
                $rawValue = $email->getRawOriginal('sent_at') ?? $email->sent_at;
                $date = Carbon::parse($rawValue, 'UTC')->setTimezone($userTimezone);
                $email->sent_at_formatted = $date->format('M d, Y h:i A');
            }
            if ($email->delivered_at) {
                $rawValue = $email->getRawOriginal('delivered_at') ?? $email->delivered_at;
                $date = Carbon::parse($rawValue, 'UTC')->setTimezone($userTimezone);
                $email->delivered_at_formatted = $date->format('M d, Y h:i A');
            }
            if ($email->opened_at) {
                $rawValue = $email->getRawOriginal('opened_at') ?? $email->opened_at;
                $date = Carbon::parse($rawValue, 'UTC')->setTimezone($userTimezone);
                $email->opened_at_formatted = $date->format('M d, Y h:i A');
            }
            if ($email->clicked_at) {
                $rawValue = $email->getRawOriginal('clicked_at') ?? $email->clicked_at;
                $date = Carbon::parse($rawValue, 'UTC')->setTimezone($userTimezone);
                $email->clicked_at_formatted = $date->format('M d, Y h:i A');
            }

            return $email;
        });

        // Ensure emails have proper structure even if recipient is deleted
        $newsletter->emails->each(function ($email) {
            if (! $email->recipient) {
                // If recipient is deleted, we still have the email address
                $email->recipient = null;
            }
        });

        $user = Auth::user();

        // Build organization address from available fields
        $orgAddress = '';
        if ($user->organization) {
            $addressParts = array_filter([
                $user->organization->street,
                $user->organization->city,
                $user->organization->state,
                $user->organization->zip,
            ]);
            $orgAddress = ! empty($addressParts) ? implode(', ', $addressParts) : 'Your Organization Address';
        }

        // Carbon automatically uses config('app.timezone') set by middleware
        $currentDate = Carbon::now()->format('F j, Y');
        $currentYear = (string) Carbon::now()->year;

        // Get real data for variable preview
        // For public view link, use the actual newsletter public URL
        $publicViewLink = route('newsletter.show', $newsletter->id);

        $previewData = [
            'organization_name' => $user->organization->name ?? ($user->name ?? 'Your Organization'),
            'organization_email' => $user->organization->email ?? ($user->email ?? 'wendhi@stuttiegroup.com'),
            'organization_phone' => $user->organization->phone ?? ($user->contact_number ?? '+1 (555) 000-0000'),
            'organization_address' => $orgAddress ?: 'Your Organization Address',
            'recipient_name' => $user->name ?? 'Recipient Name',
            'recipient_email' => $user->email ?? 'recipient@example.com',
            'current_date' => $currentDate,
            'current_year' => $currentYear,
            'unsubscribe_link' => url('/newsletter/unsubscribe?token=preview_token'),
            'public_view_link' => $publicViewLink,
        ];

        return Inertia::render('newsletter/show', [
            'newsletter' => $newsletter,
            'previewData' => $previewData,
        ]);
    }

    /**
     * Send newsletter
     */
    public function send(Request $request, $id)
    {
        $this->authorizePermission($request, 'newsletter.send');

        $newsletter = Newsletter::with('organization.user')->findOrFail($id);

        if (! in_array($newsletter->status, ['draft', 'paused'])) {
            return back()->with('error', 'Newsletter can only be sent from draft or paused status.');
        }

        $sendVia = $newsletter->send_via ?? 'email';
        $walletUser = Auth::user();
        if (! $walletUser) {
            return back()->with('error', 'You must be signed in to send.');
        }
        $smsLeft = max(0, (int) ($walletUser->sms_included ?? 0) - (int) ($walletUser->sms_used ?? 0));
        $emailsLeft = max(0, (int) ($walletUser->emails_included ?? 0) - (int) ($walletUser->emails_used ?? 0));
        if ($sendVia === 'sms' && $smsLeft < 1) {
            return back()->with('error', 'No SMS credits remaining. Open Create Newsletter or Templates and purchase an SMS pack ($25 = 1,200 SMS) before sending SMS.');
        }
        if ($sendVia === 'email' && $emailsLeft < 1) {
            return back()->with('error', 'No email credits remaining. Purchase an email pack from the Newsletter or Templates page before sending.');
        }
        if ($sendVia === 'both' && $smsLeft < 1 && $emailsLeft < 1) {
            return back()->with('error', 'No email or SMS credits remaining. Purchase packs from the Newsletter or Templates page before sending.');
        }

        $meta = $newsletter->metadata ?? [];
        $meta = is_array($meta) ? $meta : [];
        $meta['billing_user_id'] = (int) $walletUser->id;

        // Update status to sending (billing_user_id must match Auth user so wallet UI matches SendNewsletterJob deductions)
        $newsletter->update([
            'status' => 'sending',
            'metadata' => $meta,
        ]);

        // Use new targeting system to get recipients
        try {
            $targetedUsers = $newsletter->getTargetedUsers();

            if ($targetedUsers->isEmpty()) {
                $newsletter->update(['status' => 'failed']);

                return back()->with('error', 'No recipients found to send the newsletter to. Please check your targeting settings.');
            }

            // Dispatch job to send emails (job will create email records)
            dispatch(new SendNewsletterJob($newsletter));

            return back()->with('success', 'Newsletter is being sent to '.$targetedUsers->count().' recipients.');
        } catch (\Exception $e) {
            Log::error('Error in send method', [
                'newsletter_id' => $newsletter->id,
                'error' => $e->getMessage(),
            ]);
            $newsletter->update(['status' => 'failed']);

            return back()->with('error', 'Failed to send newsletter: '.$e->getMessage());
        }
    }

    /**
     * Get average open rate
     */
    private function getAverageOpenRate(): float
    {
        $query = Newsletter::where('status', 'sent');

        $total = $query->sum('delivered_count');
        $opened = $query->sum('opened_count');

        return $total > 0 ? round(($opened / $total) * 100, 2) : 0;
    }

    /**
     * Get average click rate
     */
    private function getAverageClickRate(): float
    {
        $query = Newsletter::where('status', 'sent');

        $total = $query->sum('delivered_count');
        $clicked = $query->sum('clicked_count');

        return $total > 0 ? round(($clicked / $total) * 100, 2) : 0;
    }

    /**
     * Edit newsletter
     */
    public function edit(Request $request, $id): Response
    {
        $this->authorizePermission($request, 'newsletter.edit');

        $newsletter = Newsletter::with(['template'])->findOrFail($id);
        $templates = NewsletterTemplate::where('is_active', true)->get();

        $user = Auth::user();

        // Build organization address from available fields
        $orgAddress = '';
        if ($user->organization) {
            $addressParts = array_filter([
                $user->organization->street,
                $user->organization->city,
                $user->organization->state,
                $user->organization->zip,
            ]);
            $orgAddress = ! empty($addressParts) ? implode(', ', $addressParts) : 'Your Organization Address';
        }

        // Get real data for variable preview
        // For public view link, use the actual newsletter public URL if available
        $publicViewLink = route('newsletter.show', $newsletter->id);

        $previewData = [
            'organization_name' => $user->organization->name ?? ($user->name ?? 'Your Organization'),
            'organization_email' => $user->organization->email ?? ($user->email ?? 'wendhi@stuttiegroup.com'),
            'organization_phone' => $user->organization->phone ?? ($user->contact_number ?? '+1 (555) 000-0000'),
            'organization_address' => $orgAddress ?: 'Your Organization Address',
            'recipient_name' => $user->name ?? 'Recipient Name',
            'recipient_email' => $user->email ?? 'recipient@example.com',
            'current_date' => Carbon::now()->format('F j, Y'),
            'current_year' => (string) Carbon::now()->year,
            'unsubscribe_link' => url('/newsletter/unsubscribe?token=preview_token'),
            'public_view_link' => $publicViewLink,
        ];

        return Inertia::render('newsletter/edit', [
            'newsletter' => $newsletter,
            'templates' => $templates,
            'previewData' => $previewData,
        ]);
    }

    /**
     * Update newsletter
     */
    public function update(Request $request, $id)
    {
        $this->authorizePermission($request, 'newsletter.update');

        $newsletter = Newsletter::findOrFail($id);

        $request->validate([
            'subject' => 'required|string|max:255',
            'content' => $request->input('send_via') === 'sms'
                ? 'required|string|max:'.self::NEWSLETTER_SMS_PLAIN_MAX_CHARS
                : 'nullable|string',
            'html_content' => 'nullable|string',
            'newsletter_template_id' => 'required|exists:newsletter_templates,id',
            'send_via' => 'required|in:email,sms,both',
        ]);

        $sendVia = $request->input('send_via', 'email');
        $contentTrim = trim((string) $request->content);
        $htmlTrim = trim((string) $request->html_content);

        if ($sendVia === 'sms') {
            if ($contentTrim === '') {
                throw ValidationException::withMessages([
                    'content' => 'Plain text content is required for SMS.',
                ]);
            }
            $htmlTrim = '';
        } elseif ($sendVia === 'both') {
            if ($contentTrim === '') {
                throw ValidationException::withMessages([
                    'content' => 'Plain text content is required for the SMS leg of this send.',
                ]);
            }
            if ($htmlTrim === '') {
                throw ValidationException::withMessages([
                    'html_content' => 'HTML content is required when sending both SMS and email.',
                ]);
            }
        } elseif ($contentTrim === '' && $htmlTrim === '') {
            throw ValidationException::withMessages([
                'content' => 'Provide plain text content and/or HTML content.',
                'html_content' => 'Provide plain text content and/or HTML content.',
            ]);
        }

        $newsletter->update([
            'subject' => $request->subject,
            'content' => $contentTrim === '' ? '' : $request->content,
            'html_content' => $htmlTrim === '' ? null : $request->html_content,
            'newsletter_template_id' => $request->newsletter_template_id,
            'send_via' => $sendVia,
            'status' => 'draft', // Reset to draft when editing
        ]);

        return redirect()->route('newsletter.show', $newsletter->id)
            ->with('success', 'Newsletter updated successfully!');
    }

    /**
     * Update newsletter schedule
     */
    public function updateSchedule(Request $request, $id)
    {
        $this->authorizePermission($request, 'newsletter.update');

        $newsletter = Newsletter::findOrFail($id);

        // Only allow schedule update for scheduled newsletters (not sent, failed, or sending)
        if (! in_array($newsletter->status, ['scheduled', 'draft'])) {
            return back()->with('error', 'Only scheduled or draft newsletters can have their schedule updated.');
        }

        // Allow updating to past dates (for late newsletters) or future dates
        $request->validate([
            'scheduled_at' => 'required|date',
        ]);

        // Carbon automatically uses config('app.timezone') set by middleware
        \Illuminate\Support\Facades\Log::info('Update schedule debug:', [
            'scheduled_at_input' => $request->scheduled_at,
            'user_timezone' => config('app.timezone'),
            'browser_timezone' => $request->header('X-Timezone'),
        ]);

        // Parse the scheduled time (in user's timezone from config) and convert to UTC
        $scheduledAt = Carbon::parse($request->scheduled_at)->utc();

        // Convert back to user timezone for verification
        $localTime = $scheduledAt->copy()->setTimezone(config('app.timezone'));

        Log::info('Schedule conversion result:', [
            'original_input' => $request->scheduled_at,
            'user_timezone' => config('app.timezone'),
            'converted_utc' => $scheduledAt->toISOString(),
            'converted_local' => $localTime->toDateTimeString(),
            'converted_local_iso' => $localTime->toISOString(),
            'verification' => "User entered {$request->scheduled_at} in ".config('app.timezone').", stored as {$scheduledAt->toDateTimeString()} UTC, which is {$localTime->toDateTimeString()} in ".config('app.timezone'),
        ]);

        // Check if updating to a past date (late newsletter)
        $isLate = $scheduledAt->lt(now());
        if ($isLate) {
            Log::warning('Updating newsletter schedule to past date - will be sent immediately', [
                'newsletter_id' => $newsletter->id,
                'scheduled_at' => $scheduledAt->toISOString(),
                'current_time' => now()->toISOString(),
            ]);
        }

        // Update both scheduled_at and send_date to keep them in sync
        $newsletter->update([
            'scheduled_at' => $scheduledAt,
            'send_date' => $scheduledAt, // Keep send_date in sync
        ]);

        $message = $isLate
            ? 'Newsletter schedule updated. Since the time is in the past, it will be sent immediately when the scheduler runs.'
            : 'Newsletter schedule updated successfully.';

        $localTime = $scheduledAt->copy()->setTimezone(config('app.timezone'));

        Log::info('Newsletter schedule updated', [
            'newsletter_id' => $newsletter->id,
            'old_scheduled_at_utc' => $newsletter->getOriginal('scheduled_at'),
            'old_scheduled_at_local' => $newsletter->getOriginal('scheduled_at') ? Carbon::parse($newsletter->getOriginal('scheduled_at'))->setTimezone(config('app.timezone'))->toDateTimeString() : null,
            'new_scheduled_at_utc' => $scheduledAt->toISOString(),
            'new_scheduled_at_local' => $localTime->toDateTimeString(),
            'old_send_date_utc' => $newsletter->getOriginal('send_date'),
            'new_send_date_utc' => $scheduledAt->toISOString(),
            'is_late' => $isLate,
            'user_timezone' => config('app.timezone'),
        ]);

        return redirect()->route('newsletter.index')
            ->with('success', $message);
    }

    /**
     * Pause newsletter (move back to draft)
     */
    public function pause(Request $request, $id)
    {
        $this->authorizePermission($request, 'newsletter.update');

        $newsletter = Newsletter::findOrFail($id);

        // Allow pausing for scheduled and sending newsletters
        if (! in_array($newsletter->status, ['scheduled', 'sending'])) {
            return back()->with('error', 'Only scheduled or sending newsletters can be paused.');
        }

        $newsletter->update([
            'status' => 'paused',
            'scheduled_at' => null,
        ]);

        return redirect()->route('newsletter.index')
            ->with('success', 'Newsletter paused successfully!');
    }

    /**
     * Resume newsletter (schedule for sending)
     */
    public function resume(Request $request, $id)
    {
        $this->authorizePermission($request, 'newsletter.update');

        $newsletter = Newsletter::findOrFail($id);

        // Only allow resuming for paused newsletters
        if ($newsletter->status !== 'paused') {
            return back()->with('error', 'Only paused newsletters can be resumed.');
        }

        $request->validate([
            'scheduled_at' => 'nullable|date|after:now',
        ]);

        $newsletter->update([
            'status' => $request->scheduled_at ? 'scheduled' : 'draft',
            'scheduled_at' => $request->scheduled_at,
        ]);

        $message = $request->scheduled_at ?
            'Newsletter scheduled successfully!' :
            'Newsletter resumed and ready to send!';

        return redirect()->route('newsletter.index')
            ->with('success', $message);
    }

    /**
     * Manually send newsletter (admin override)
     */
    public function manualSend(Request $request, $id)
    {
        Log::info('Manual send request received', [
            'newsletter_id' => $id,
            'user_id' => Auth::id(),
            'request_data' => $request->all(),
        ]);

        $this->authorizePermission($request, 'newsletter.send');

        $newsletter = Newsletter::with('organization.user')->findOrFail($id);

        Log::info('Newsletter found for manual send', [
            'newsletter_id' => $newsletter->id,
            'current_status' => $newsletter->status,
            'subject' => $newsletter->subject,
            'target_type' => $newsletter->target_type ?? 'all',
            'target_users' => $newsletter->target_users ?? [],
            'target_organizations' => $newsletter->target_organizations ?? [],
        ]);

        try {
            // Allow manual sending for any status (including sent for "Send Again" functionality)
            // Only prevent sending if currently in sending status
            if ($newsletter->status === 'sending') {
                return back()->with('error', 'Newsletter is currently being sent. Please wait for it to complete.');
            }

            $sendVia = $newsletter->send_via ?? 'email';
            $walletUser = Auth::user();
            if (! $walletUser) {
                return back()->with('error', 'You must be signed in to send.');
            }
            $smsLeft = max(0, (int) ($walletUser->sms_included ?? 0) - (int) ($walletUser->sms_used ?? 0));
            $emailsLeft = max(0, (int) ($walletUser->emails_included ?? 0) - (int) ($walletUser->emails_used ?? 0));
            if ($sendVia === 'sms' && $smsLeft < 1) {
                return back()->with('error', 'No SMS credits remaining. Purchase an SMS pack from the Newsletter create or template page before sending SMS.');
            }
            if ($sendVia === 'email' && $emailsLeft < 1) {
                return back()->with('error', 'No email credits remaining. Purchase an email pack from the Newsletter or Templates page before sending.');
            }
            if ($sendVia === 'both' && $smsLeft < 1 && $emailsLeft < 1) {
                return back()->with('error', 'No email or SMS credits remaining. Purchase packs from the Newsletter or Templates page before sending.');
            }

            // Store original status for "Send Again" logic
            $wasSent = $newsletter->status === 'sent';

            $meta = $newsletter->metadata ?? [];
            $meta = is_array($meta) ? $meta : [];
            $meta['billing_user_id'] = (int) $walletUser->id;

            // Update status to sending
            $newsletter->update([
                'status' => 'sending',
                'scheduled_at' => now(),
                'metadata' => $meta,
            ]);

            Log::info('Newsletter status updated to sending', [
                'newsletter_id' => $newsletter->id,
            ]);

            // Clear existing email records if this is a "Send Again" (newsletter was previously sent)
            if ($wasSent) {
                NewsletterEmail::where('newsletter_id', $newsletter->id)->delete();
                Log::info('Cleared existing email records for send again', [
                    'newsletter_id' => $newsletter->id,
                ]);
            }

            // Use new targeting system - getTargetedUsers() handles all cases including 'all'
            // The job will create email records from the targeted users
            Log::info('Determining recipients using targeting system', [
                'newsletter_id' => $newsletter->id,
                'target_type' => $newsletter->target_type ?? 'all',
            ]);

            try {
                $targetedUsers = $newsletter->getTargetedUsers();
                Log::info('Got targeted users', [
                    'newsletter_id' => $newsletter->id,
                    'targeted_users_count' => $targetedUsers->count(),
                ]);

                if ($targetedUsers->isEmpty()) {
                    $newsletter->update(['status' => 'failed']);
                    Log::warning('No targeted recipients found', [
                        'newsletter_id' => $newsletter->id,
                        'target_type' => $newsletter->target_type,
                    ]);

                    return back()->with('error', 'No recipients found to send the newsletter to. Please check your targeting settings or add recipients.');
                }

                // Create email records for targeted users (let the job handle it, but we can pre-create for immediate feedback)
                // Actually, let the job handle this to avoid duplicate creation
                Log::info('Recipients determined, job will create email records', [
                    'newsletter_id' => $newsletter->id,
                    'recipients_count' => $targetedUsers->count(),
                ]);
            } catch (\Exception $e) {
                Log::error('Error getting targeted users', [
                    'newsletter_id' => $newsletter->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                $newsletter->update(['status' => 'failed']);

                return back()->with('error', 'Error determining recipients: '.$e->getMessage());
            }

            // Dispatch job to send emails
            Log::info('Dispatching SendNewsletterJob', [
                'newsletter_id' => $newsletter->id,
            ]);

            dispatch(new SendNewsletterJob($newsletter));

            // Get recipient count for message
            $recipientCount = 0;
            try {
                $recipientCount = $newsletter->getTargetedUsers()->count();
            } catch (\Exception $e) {
                Log::error('Error counting targeted users', [
                    'newsletter_id' => $newsletter->id,
                    'error' => $e->getMessage(),
                ]);
                // Use a fallback count from email records if they exist
                $recipientCount = NewsletterEmail::where('newsletter_id', $newsletter->id)
                    ->where('status', 'pending')
                    ->count();
            }

            $message = $wasSent ?
                'Newsletter is being sent again to '.$recipientCount.' recipients.' :
                'Newsletter is being sent to '.$recipientCount.' recipients.';

            Log::info('Newsletter manual send completed', [
                'newsletter_id' => $newsletter->id,
                'recipients_count' => $recipientCount,
                'was_sent' => $wasSent,
                'message' => $message,
            ]);

            return redirect()->route('newsletter.index')
                ->with('success', $message);

        } catch (\Exception $e) {
            Log::error('Error in manual send', [
                'newsletter_id' => $newsletter->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $newsletter->update(['status' => 'failed']);

            return back()->with('error', 'Failed to send newsletter: '.$e->getMessage());
        }
    }

    /**
     * Delete newsletter
     */
    public function destroy(Request $request, $id)
    {
        $this->authorizePermission($request, 'newsletter.delete');

        $newsletter = Newsletter::findOrFail($id);

        Log::info('Newsletter delete request', [
            'newsletter_id' => $newsletter->id,
            'status' => $newsletter->status,
            'user_id' => Auth::id(),
        ]);

        // Allow deletion of any status except currently sending (to prevent data loss)
        if ($newsletter->status === 'sending') {
            return back()->with('error', 'Cannot delete newsletter while it is being sent. Please wait for it to complete or pause it first.');
        }

        try {
            // Delete associated email records first
            NewsletterEmail::where('newsletter_id', $newsletter->id)->delete();

            // Delete the newsletter
            $newsletter->delete();

            Log::info('Newsletter deleted successfully', [
                'newsletter_id' => $id,
            ]);

            return redirect()->route('newsletter.index')
                ->with('success', 'Newsletter deleted successfully!');
        } catch (\Exception $e) {
            Log::error('Error deleting newsletter', [
                'newsletter_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return back()->with('error', 'Failed to delete newsletter: '.$e->getMessage());
        }
    }

    /**
     * Stripe checkout to add prepaid SMS credits (same flow as email-invite purchase).
     */
    public function purchaseSms(Request $request)
    {
        $this->authorizePermission($request, 'newsletter.create');

        $request->validate([
            'package_id' => 'required|exists:sms_packages,id',
        ]);

        $user = $request->user();
        $package = SmsPackage::active()->findOrFail((int) $request->input('package_id'));

        try {
            $transaction = $user->recordTransaction([
                'type' => 'sms_purchase',
                'amount' => $package->price,
                'payment_method' => 'stripe',
                'status' => 'pending',
                'meta' => [
                    'type' => 'sms_purchase',
                    'sms_to_add' => $package->sms_count,
                    'package_id' => $package->id,
                    'package_name' => $package->name,
                    'description' => 'Purchase '.$package->name,
                ],
            ]);

            $amountInCents = (int) ($package->price * 100);

            $checkout = $user->checkoutCharge(
                $amountInCents,
                $package->name,
                1,
                [
                    'success_url' => route('newsletter.purchase-sms.success').'?session_id={CHECKOUT_SESSION_ID}',
                    'cancel_url' => route('newsletter.create').'?canceled=1',
                    'metadata' => [
                        'user_id' => (string) $user->id,
                        'transaction_id' => (string) $transaction->id,
                        'type' => 'sms_purchase',
                        'sms_to_add' => (string) $package->sms_count,
                        'package_id' => (string) $package->id,
                        'amount' => (string) $package->price,
                    ],
                    'payment_method_types' => ['card'],
                ]
            );

            return Inertia::location($checkout->url);
        } catch (\Exception $e) {
            Log::error('SMS pack checkout error', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
            ]);

            return back()->withErrors([
                'message' => 'Failed to create checkout session. Please try again.',
            ]);
        }
    }

    /**
     * Stripe return URL after successful SMS pack payment.
     */
    public function purchaseSmsSuccess(Request $request)
    {
        $this->authorizePermission($request, 'newsletter.create');

        try {
            $sessionId = $request->query('session_id');
            if (! $sessionId) {
                return redirect()->route('newsletter.create')->with('error', 'Invalid session.');
            }

            $user = $request->user();
            $session = Cashier::stripe()->checkout->sessions->retrieve($sessionId);

            if ($session->payment_status !== 'paid') {
                return redirect()->route('newsletter.create')->with('error', 'Payment was not completed.');
            }

            $metadata = $session->metadata ?? [];
            $smsToAdd = (int) ($metadata['sms_to_add'] ?? 0);
            $transactionId = $metadata['transaction_id'] ?? null;

            if ($smsToAdd > 0) {
                $user->increment('sms_included', $smsToAdd);
            }

            if ($transactionId) {
                $transaction = \App\Models\Transaction::find($transactionId);
                if ($transaction) {
                    $transaction->update([
                        'status' => 'completed',
                        'meta' => array_merge($transaction->meta ?? [], [
                            'type' => 'sms_purchase',
                            'stripe_session_id' => $sessionId,
                            'stripe_payment_intent' => $session->payment_intent,
                            'sms_added' => $smsToAdd,
                        ]),
                    ]);
                }
            }

            return redirect()->route('newsletter.create')->with(
                'success',
                "Successfully added {$smsToAdd} SMS credits to your wallet!"
            );
        } catch (\Exception $e) {
            Log::error('SMS purchase success handler error', [
                'error' => $e->getMessage(),
                'session_id' => $request->query('session_id'),
            ]);

            return redirect()->route('newsletter.create')->with('error', 'Error confirming payment. Please contact support.');
        }
    }

    /**
     * Toggle SMS auto-recharge preference (billing automation can be wired later).
     */
    public function updateSmsWalletPreferences(Request $request)
    {
        $this->authorizePermission($request, 'newsletter.create');

        $validated = $request->validate([
            'sms_auto_recharge_enabled' => 'required|boolean',
        ]);

        $request->user()->update([
            'sms_auto_recharge_enabled' => $validated['sms_auto_recharge_enabled'],
        ]);

        return back()->with('success', 'SMS wallet preferences updated.');
    }

    /**
     * Unsubscribe from newsletter
     */
    public function unsubscribe(Request $request, $token)
    {
        $recipient = NewsletterRecipient::where('unsubscribe_token', $token)->first();

        if (! $recipient) {
            return view('newsletter.unsubscribe', [
                'success' => false,
                'message' => 'Invalid unsubscribe link.',
            ]);
        }

        if ($recipient->status === 'unsubscribed') {
            return view('newsletter.unsubscribe', [
                'success' => true,
                'message' => 'You have already unsubscribed from this newsletter.',
            ]);
        }

        $recipient->update([
            'status' => 'unsubscribed',
            'unsubscribed_at' => now(),
        ]);

        return view('newsletter.unsubscribe', [
            'success' => true,
            'message' => 'You have been successfully unsubscribed from the newsletter.',
            'recipient' => $recipient,
        ]);
    }

    /**
     * By role, Organizations, and Custom newsletter targeting (Pro): not tied to generic subscription/plan —
     * only explicit one-time purchase (newsletter_pro_targeting_purchased_at) or platform admin.
     */
    private function userCanUseNewsletterProTargeting(User $user): bool
    {
        if (($user->role ?? '') === 'admin') {
            return true;
        }
        if (method_exists($user, 'hasRole') && $user->hasRole('admin')) {
            return true;
        }
        if ($user->newsletter_pro_targeting_purchased_at !== null) {
            return true;
        }

        return false;
    }

    /**
     * One-time Stripe checkout — lifetime access to Organizations + Custom targeting (no subscription plan row).
     */
    public function purchaseProTargeting(Request $request)
    {
        $this->authorizePermission($request, 'newsletter.create');

        if (! config('newsletter.pro_targeting_purchase_enabled', true)) {
            return back()->with('error', 'Pro targeting purchase is not available right now.');
        }

        $priceUsd = (float) config('newsletter.pro_targeting_lifetime_price_usd', 0);
        if ($priceUsd <= 0) {
            return back()->with('error', 'Pro targeting price is not configured.');
        }

        $user = $request->user();
        if ($user instanceof User && $this->userCanUseNewsletterProTargeting($user)) {
            return redirect()->route('newsletter.create-advanced')->with('success', 'You already have access to Pro newsletter targeting.');
        }

        try {
            $transaction = $user->recordTransaction([
                'type' => 'newsletter_pro_targeting_lifetime',
                'amount' => $priceUsd,
                'payment_method' => 'stripe',
                'status' => 'pending',
                'meta' => [
                    'type' => 'newsletter_pro_targeting_lifetime',
                    'description' => 'Newsletter Pro targeting (Organizations + Custom) — lifetime',
                    'price_usd' => $priceUsd,
                ],
            ]);

            $amountInCents = (int) round($priceUsd * 100);

            $checkout = $user->checkoutCharge(
                $amountInCents,
                'Newsletter Pro targeting (lifetime)',
                1,
                [
                    'success_url' => route('newsletter.purchase-pro-targeting.success').'?session_id={CHECKOUT_SESSION_ID}',
                    'cancel_url' => route('newsletter.create-advanced').'?canceled=1',
                    'metadata' => [
                        'user_id' => (string) $user->id,
                        'transaction_id' => (string) $transaction->id,
                        'type' => 'newsletter_pro_targeting_lifetime',
                        'amount' => (string) $priceUsd,
                    ],
                    'payment_method_types' => ['card'],
                ]
            );

            return Inertia::location($checkout->url);
        } catch (\Exception $e) {
            Log::error('Newsletter Pro targeting checkout error', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
            ]);

            return back()->withErrors([
                'message' => 'Failed to start checkout. Please try again.',
            ]);
        }
    }

    /**
     * Stripe return after successful Pro targeting one-time payment.
     */
    public function purchaseProTargetingSuccess(Request $request)
    {
        $this->authorizePermission($request, 'newsletter.create');

        try {
            $sessionId = $request->query('session_id');
            if (! $sessionId) {
                return redirect()->route('newsletter.create-advanced')->with('error', 'Invalid session.');
            }

            $user = $request->user();
            $session = Cashier::stripe()->checkout->sessions->retrieve($sessionId);

            if ($session->payment_status !== 'paid') {
                return redirect()->route('newsletter.create-advanced')->with('error', 'Payment was not completed.');
            }

            $metadata = $session->metadata ?? [];
            if (($metadata['type'] ?? '') !== 'newsletter_pro_targeting_lifetime') {
                return redirect()->route('newsletter.create-advanced')->with('error', 'Invalid payment type.');
            }

            $user->forceFill([
                'newsletter_pro_targeting_purchased_at' => now(),
            ])->save();

            $transactionId = $metadata['transaction_id'] ?? null;
            if ($transactionId) {
                $transaction = \App\Models\Transaction::find($transactionId);
                if ($transaction) {
                    $paymentIntentRef = $session->payment_intent ?? null;
                    $paymentIntentId = is_string($paymentIntentRef)
                        ? $paymentIntentRef
                        : (is_object($paymentIntentRef) ? ($paymentIntentRef->id ?? null) : null);
                    $stripeFeeUsd = $this->stripeProcessingFeeUsdFromPaymentIntentId($paymentIntentId);

                    $transaction->update([
                        'status' => 'completed',
                        'fee' => $stripeFeeUsd,
                        'meta' => array_merge($transaction->meta ?? [], [
                            'type' => 'newsletter_pro_targeting_lifetime',
                            'stripe_session_id' => $sessionId,
                            'stripe_payment_intent' => $paymentIntentId ?? $session->payment_intent,
                            'stripe_fee' => $stripeFeeUsd,
                            'stripe_processing_fee' => $stripeFeeUsd,
                        ]),
                    ]);
                }
            }

            return redirect()->route('newsletter.create-advanced')->with(
                'success',
                'Pro newsletter targeting is unlocked for your account — lifetime access to By role, Organizations, and Custom.'
            );
        } catch (\Exception $e) {
            Log::error('Newsletter Pro targeting success handler error', [
                'error' => $e->getMessage(),
                'session_id' => $request->query('session_id'),
            ]);

            return redirect()->route('newsletter.create-advanced')->with('error', 'Could not confirm payment. Contact support if you were charged.');
        }
    }

    /**
     * Actual Stripe processing fee (USD) from the charge balance transaction (not an estimate).
     */
    private function stripeProcessingFeeUsdFromPaymentIntentId(?string $paymentIntentId): float
    {
        if ($paymentIntentId === null || $paymentIntentId === '') {
            return 0.0;
        }

        try {
            $pi = PaymentIntent::retrieve($paymentIntentId, [
                'expand' => ['latest_charge.balance_transaction'],
            ]);
            $charge = $pi->latest_charge ?? null;
            $bt = is_object($charge) ? ($charge->balance_transaction ?? null) : null;
            if (is_object($bt) && isset($bt->fee)) {
                return round((float) $bt->fee / 100, 2);
            }
        } catch (\Throwable $e) {
            Log::debug('Newsletter Pro targeting: could not read Stripe processing fee', [
                'payment_intent_id' => $paymentIntentId,
                'error' => $e->getMessage(),
            ]);
        }

        return 0.0;
    }
}
