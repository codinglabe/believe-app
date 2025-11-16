<?php

namespace App\Http\Controllers;

use App\Models\Newsletter;
use App\Models\NewsletterTemplate;
use App\Models\NewsletterRecipient;
use App\Models\NewsletterEmail;
use App\Models\Organization;
use App\Models\User;
use App\Jobs\SendNewsletterJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class NewsletterController extends BaseController
{
    /**
     * Display newsletter dashboard
     */
    public function index(Request $request): Response
    {
        $this->authorizePermission($request, 'newsletter.read');

        $newsletters = Newsletter::with(['template', 'organization'])
            ->select([
                'id', 'subject', 'status', 'scheduled_at', 'send_date',
                'sent_at', 'schedule_type', 'total_recipients', 'sent_count',
                'delivered_count', 'opened_count', 'clicked_count',
                'newsletter_template_id', 'organization_id'
            ])
            ->latest()
            ->paginate(10);

        $templates = NewsletterTemplate::where('is_active', true)->get();

        $recipients = NewsletterRecipient::active()->count();

        $stats = [
            'total_newsletters' => $newsletters->total(),
            'sent_newsletters' => Newsletter::where('status', 'sent')->count(),
            'total_recipients' => $recipients,
            'avg_open_rate' => $this->getAverageOpenRate(),
            'avg_click_rate' => $this->getAverageClickRate(),
        ];

        return Inertia::render('newsletter/index', [
            'newsletters' => $newsletters,
            'templates' => $templates,
            'stats' => $stats,
        ]);
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
                'frequency_limit', 'custom_frequency_days', 'frequency_notes'
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
                'id', 'name', 'subject', 'content' , 'template_type', 'html_content',
                'frequency_limit', 'custom_frequency_days', 'frequency_notes'
            ])
            ->get();
        $users = User::with('roles')->where('email_verified_at', '!=', null)->get();
        $organizations = Organization::where('status', 'active')->get();
        $roles = \Spatie\Permission\Models\Role::pluck('name')->toArray();

        return Inertia::render('newsletter/create-advanced', [
            'templates' => $templates,
            'users' => $users,
            'organizations' => $organizations,
            'roles' => $roles,
        ]);
    }

    /**
     * Create new template
     */
    public function createTemplate(Request $request): Response
    {
        $this->authorizePermission($request, 'newsletter.create');

        return Inertia::render('newsletter/template-form');
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
            'content' => 'required|string',
            'html_content' => 'nullable|string',
            'template_type' => 'required|in:newsletter,announcement,event',
            'settings' => 'nullable|array',
        ]);

        $template = NewsletterTemplate::create([
            'organization_id' => null,
            'name' => $request->name,
            'subject' => $request->subject,
            'content' => $request->content,
            'html_content' => $request->html_content,
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

        return Inertia::render('newsletter/template-form', [
            'template' => $template,
        ]);
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
            'content' => 'required|string',
            'html_content' => 'nullable|string',
            'template_type' => 'required|in:newsletter,announcement,event',
            'settings' => 'nullable|array',
        ]);

        $template = NewsletterTemplate::findOrFail($id);

        $template->update([
            'name' => $request->name,
            'subject' => $request->subject,
            'content' => $request->content,
            'html_content' => $request->html_content,
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

        // Build query for organizations with search
        $organizationsQuery = Organization::with(['user', 'newsletterRecipients']);

        // Apply search filter
        if (!empty($search) && trim($search) !== '') {
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

        // Get newsletter subscription stats
        $totalOrganizations = Organization::count();
        $activeSubscriptions = NewsletterRecipient::active()->count();
        $unsubscribed = NewsletterRecipient::unsubscribed()->count();
        $bounced = NewsletterRecipient::bounced()->count();

        // Calculate not subscribed organizations (organizations without any newsletter subscription)
        $notSubscribed = Organization::whereDoesntHave('newsletterRecipients')->count();

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
        if (!empty($manualSearch) && trim($manualSearch) !== '') {
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

        // TODO: Implement actual test email sending
        // For now, just return success
        return back()->with('success', 'Test email sent successfully!');
    }

    /**
     * Export recipients
     */
    public function exportRecipients(Request $request)
    {
        $this->authorizePermission($request, 'newsletter.read');

        $search = $request->input('search', '');
        $statusFilter = $request->input('status_filter', 'all');

        // Build query for organizations with search
        $organizationsQuery = Organization::with(['user', 'newsletterRecipients']);

        // Apply search filter
        if (!empty($search) && trim($search) !== '') {
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

        $filename = 'newsletter_recipients_' . date('Y-m-d_H-i-s') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        $callback = function() use ($organizations) {
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
                'Created Date'
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
                    date('Y-m-d H:i:s', strtotime($org->created_at))
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
            'file' => 'required|file|mimes:csv,txt|max:2048'
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();

        $imported = 0;
        $errors = [];

        if (($handle = fopen($path, 'r')) !== FALSE) {
            // Skip header row
            fgetcsv($handle);

            while (($data = fgetcsv($handle, 1000, ',')) !== FALSE) {
                if (count($data) >= 2) {
                    $email = trim($data[0]);
                    $name = isset($data[1]) ? trim($data[1]) : null;

                    if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
                        // Check if recipient already exists
                        $existing = NewsletterRecipient::where('email', $email)->first();

                        if (!$existing) {
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
        if (!empty($errors)) {
            $message .= " Errors: " . implode(', ', array_slice($errors, 0, 5));
            if (count($errors) > 5) {
                $message .= " and " . (count($errors) - 5) . " more errors.";
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

        $templates = NewsletterTemplate::where('is_active', true)->get();

        return Inertia::render('newsletter/create', [
            'templates' => $templates,
        ]);
    }

    /**
     * Store new newsletter
     */
    public function store(Request $request)
    {
        $this->authorizePermission($request, 'newsletter.create');

        // Debug the request data
        \Log::info('Newsletter store request data:', [
            'send_date' => $request->send_date,
            'schedule_type' => $request->schedule_type,
            'user_timezone' => session('user_timezone'),
            'browser_timezone' => $request->header('X-Timezone'),
            'all_data' => $request->all()
        ]);

        // Custom validation for send_date based on schedule_type
        $rules = [
            'newsletter_template_id' => 'required|exists:newsletter_templates,id',
            'subject' => 'required|string|max:255',
            'content' => 'required|string',
            'html_content' => 'nullable|string',
            'scheduled_at' => 'nullable|date|after:now',
            'schedule_type' => 'required|in:immediate,scheduled,recurring',
            'recurring_settings' => 'nullable|array',
            'target_type' => 'required|in:all,users,organizations,specific',
            'target_users' => 'nullable|array',
            'target_organizations' => 'nullable|array',
            'target_roles' => 'nullable|array',
            'target_criteria' => 'nullable|array',
            'is_public' => 'boolean',
        ];

        // Add send_date validation based on schedule_type
        if ($request->schedule_type === 'scheduled' || $request->schedule_type === 'recurring') {
            $rules['send_date'] = 'required|date|after_or_equal:now';
        } else {
            $rules['send_date'] = 'nullable|date|after_or_equal:now';
        }

        $request->validate($rules);

        $template = NewsletterTemplate::findOrFail($request->newsletter_template_id);

        // Calculate send date based on schedule type
        $sendDate = null;
        $status = 'draft';

        // Get user's timezone from session or default to UTC
        $userTimezone = session('user_timezone', config('app.timezone', 'UTC'));

        switch ($request->schedule_type) {
            case 'immediate':
                $status = 'draft';
                $sendDate = null;
                break;
            case 'scheduled':
                $sendDate = $request->send_date ? \Carbon\Carbon::parse($request->send_date, $userTimezone)->utc() : null;
                $status = 'scheduled';
                break;
            case 'recurring':
                $sendDate = $request->send_date ? \Carbon\Carbon::parse($request->send_date, $userTimezone)->utc() : null;
                $status = 'scheduled';
                break;
        }

        // Get target recipients count
        $newsletter = new Newsletter([
            'organization_id' => null,
            'newsletter_template_id' => $request->newsletter_template_id,
            'subject' => $request->subject,
            'content' => $request->content,
            'html_content' => $request->html_content,
            'status' => $status,
            'scheduled_at' => $request->scheduled_at,
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
                'id', 'subject', 'content', 'html_content', 'status',
                'scheduled_at', 'send_date', 'sent_at', 'schedule_type',
                'total_recipients', 'sent_count', 'delivered_count',
                'opened_count', 'clicked_count', 'bounced_count',
                'unsubscribed_count', 'newsletter_template_id', 'organization_id'
            ])
            ->findOrFail($id);

        // Ensure emails have proper structure even if recipient is deleted
        $newsletter->emails->each(function ($email) {
            if (!$email->recipient) {
                // If recipient is deleted, we still have the email address
                $email->recipient = null;
            }
        });

        return Inertia::render('newsletter/show', [
            'newsletter' => $newsletter,
        ]);
    }

    /**
     * Send newsletter
     */
    public function send(Request $request, $id)
    {
        $this->authorizePermission($request, 'newsletter.send');

        $newsletter = Newsletter::findOrFail($id);

        if (!in_array($newsletter->status, ['draft', 'paused'])) {
            return back()->with('error', 'Newsletter can only be sent from draft or paused status.');
        }

        // Update status to sending
        $newsletter->update(['status' => 'sending']);

        // Get active recipients
        $recipients = NewsletterRecipient::active()->get();

        if ($recipients->isEmpty()) {
            $newsletter->update(['status' => 'failed']);
            return back()->with('error', 'No active recipients found to send the newsletter to.');
        }

        // Create email records
        foreach ($recipients as $recipient) {
            NewsletterEmail::create([
                'newsletter_id' => $newsletter->id,
                'newsletter_recipient_id' => $recipient->id,
                'email' => $recipient->email,
                'status' => 'pending',
            ]);
        }

        // Dispatch job to send emails
        dispatch(new SendNewsletterJob($newsletter));

        return back()->with('success', 'Newsletter is being sent to ' . $recipients->count() . ' recipients.');
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

        return Inertia::render('newsletter/edit', [
            'newsletter' => $newsletter,
            'templates' => $templates,
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
            'content' => 'required|string',
            'html_content' => 'nullable|string',
            'newsletter_template_id' => 'required|exists:newsletter_templates,id',
        ]);

        $newsletter->update([
            'subject' => $request->subject,
            'content' => $request->content,
            'html_content' => $request->html_content,
            'newsletter_template_id' => $request->newsletter_template_id,
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

        // Only allow schedule update for scheduled newsletters
        if ($newsletter->status !== 'scheduled') {
            return back()->with('error', 'Only scheduled newsletters can have their schedule updated.');
        }

        $request->validate([
            'scheduled_at' => 'required|date|after:now',
        ]);

        // Get user's timezone from session or default to UTC
        $userTimezone = session('user_timezone', config('app.timezone', 'UTC'));

        \Illuminate\Support\Facades\Log::info('Update schedule debug:', [
            'scheduled_at_input' => $request->scheduled_at,
            'user_timezone' => $userTimezone,
            'browser_timezone' => $request->header('X-Timezone'),
        ]);

        // Parse the scheduled time in the user's timezone and convert to UTC
        $scheduledAt = \Carbon\Carbon::parse($request->scheduled_at, $userTimezone)->utc();

        \Illuminate\Support\Facades\Log::info('Schedule conversion result:', [
            'original' => $request->scheduled_at,
            'converted_utc' => $scheduledAt->toISOString(),
            'converted_local' => $scheduledAt->setTimezone($userTimezone)->toISOString(),
        ]);

        // Update both scheduled_at and send_date to keep them in sync
        $newsletter->update([
            'scheduled_at' => $scheduledAt,
            'send_date' => $scheduledAt, // Keep send_date in sync
        ]);

        \Illuminate\Support\Facades\Log::info('Newsletter schedule updated', [
            'newsletter_id' => $newsletter->id,
            'old_scheduled_at' => $newsletter->getOriginal('scheduled_at'),
            'new_scheduled_at' => $request->scheduled_at,
            'old_send_date' => $newsletter->getOriginal('send_date'),
            'new_send_date' => $request->scheduled_at,
        ]);

        return redirect()->route('newsletter.index')
            ->with('success', 'Newsletter schedule updated successfully!');
    }

    /**
     * Pause newsletter (move back to draft)
     */
    public function pause(Request $request, $id)
    {
        $this->authorizePermission($request, 'newsletter.update');

        $newsletter = Newsletter::findOrFail($id);

        // Allow pausing for scheduled and sending newsletters
        if (!in_array($newsletter->status, ['scheduled', 'sending'])) {
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
            'request_data' => $request->all()
        ]);

        $this->authorizePermission($request, 'newsletter.send');

        $newsletter = Newsletter::findOrFail($id);

        Log::info('Newsletter found for manual send', [
            'newsletter_id' => $newsletter->id,
            'current_status' => $newsletter->status,
            'subject' => $newsletter->subject
        ]);

        // Allow manual sending for any status (including sent for "Send Again" functionality)
        // Only prevent sending if currently in sending status
        if ($newsletter->status === 'sending') {
            return back()->with('error', 'Newsletter is currently being sent. Please wait for it to complete.');
        }

        // Store original status for "Send Again" logic
        $wasSent = $newsletter->status === 'sent';

        // Update status to sending
        $newsletter->update([
            'status' => 'sending',
            'scheduled_at' => now(),
        ]);

        // Clear existing email records if this is a "Send Again" (newsletter was previously sent)
        if ($wasSent) {
            NewsletterEmail::where('newsletter_id', $newsletter->id)->delete();
        }

        // For new targeting system, let the job handle recipient creation
        // For backward compatibility, check if it's using old system
        if ($newsletter->target_type === 'all' && empty($newsletter->target_users) && empty($newsletter->target_organizations)) {
            // Old system - use NewsletterRecipient
            $recipients = NewsletterRecipient::active()->get();

            if ($recipients->isEmpty()) {
                $newsletter->update(['status' => 'failed']);
                return back()->with('error', 'No active recipients found to send the newsletter to.');
            }

            // Create email records for all recipients
            foreach ($recipients as $recipient) {
                NewsletterEmail::create([
                    'newsletter_id' => $newsletter->id,
                    'newsletter_recipient_id' => $recipient->id,
                    'email' => $recipient->email,
                    'status' => 'pending',
                ]);
            }
        } else {
            // New targeting system - let the job handle recipient creation
            $targetedUsers = $newsletter->getTargetedUsers();
            if ($targetedUsers->isEmpty()) {
                $newsletter->update(['status' => 'failed']);
                return back()->with('error', 'No targeted recipients found to send the newsletter to.');
            }
        }

        // Dispatch job to send emails
        dispatch(new SendNewsletterJob($newsletter));

        // Get recipient count for message
        $recipientCount = 0;
        if ($newsletter->target_type === 'all' && empty($newsletter->target_users) && empty($newsletter->target_organizations)) {
            $recipientCount = NewsletterRecipient::active()->count();
        } else {
            $recipientCount = $newsletter->getTargetedUsers()->count();
        }

        $message = $wasSent ?
            'Newsletter is being sent again to ' . $recipientCount . ' recipients.' :
            'Newsletter is being sent to ' . $recipientCount . ' recipients.';

        Log::info('Newsletter manual send completed', [
            'newsletter_id' => $newsletter->id,
            'recipients_count' => $recipientCount,
            'was_sent' => $wasSent,
            'message' => $message
        ]);

        return redirect()->route('newsletter.index')
            ->with('success', $message);
    }

    /**
     * Delete newsletter
     */
    public function destroy(Request $request, $id)
    {
        $this->authorizePermission($request, 'newsletter.delete');

        $newsletter = Newsletter::findOrFail($id);

        // Allow deletion of draft, paused, scheduled, sending, and sent newsletters
        if (!in_array($newsletter->status, ['draft', 'paused', 'scheduled', 'sending', 'sent'])) {
            return back()->with('error', 'Only draft, paused, scheduled, sending, and sent newsletters can be deleted.');
        }

        $newsletter->delete();

        return redirect()->route('newsletter.index')
            ->with('success', 'Newsletter deleted successfully!');
    }

    /**
     * Unsubscribe from newsletter
     */
    public function unsubscribe(Request $request, $token)
    {
        $recipient = NewsletterRecipient::where('unsubscribe_token', $token)->first();

        if (!$recipient) {
            return view('newsletter.unsubscribe', [
                'success' => false,
                'message' => 'Invalid unsubscribe link.'
            ]);
        }

        if ($recipient->status === 'unsubscribed') {
            return view('newsletter.unsubscribe', [
                'success' => true,
                'message' => 'You have already unsubscribed from this newsletter.'
            ]);
        }

        $recipient->update([
            'status' => 'unsubscribed',
            'unsubscribed_at' => now()
        ]);

        return view('newsletter.unsubscribe', [
            'success' => true,
            'message' => 'You have been successfully unsubscribed from the newsletter.',
            'recipient' => $recipient
        ]);
    }
}
