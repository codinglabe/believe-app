<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\UserFavoriteOrganization;
use App\Models\User;
use App\Models\Form1023Application;
use App\Models\ComplianceApplication;
use App\Models\Donation;
use App\Models\Event;
use App\Models\Form990Filing;
use App\Models\FractionalOrder;
use App\Models\JobApplication;
use App\Models\JobPost;
use App\Models\PromotionalBanner;
use App\Services\TaxComplianceService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class DashboardController extends Controller
{
    public function __construct(private TaxComplianceService $taxComplianceService)
    {
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $isAdmin = $user->role === 'admin';

        if ($isAdmin) {
            // Admin Dashboard Statistics
            $stats = [
                'totalOrganizations' => Organization::count(),
                'approvedOrganizations' => Organization::where('registration_status', 'approved')->count(),
                'pendingOrganizations' => Organization::where('registration_status', 'pending')->count(),
                'totalUsers' => User::count(),
                'totalForm1023Applications' => Form1023Application::count(),
                'pendingForm1023Applications' => Form1023Application::whereIn('status', ['pending_payment', 'awaiting_review', 'needs_more_info'])->count(),
                'approvedForm1023Applications' => Form1023Application::where('status', 'approved')->count(),
                'totalComplianceApplications' => ComplianceApplication::count(),
                'pendingComplianceApplications' => ComplianceApplication::whereIn('status', ['pending', 'under_review'])->count(),
                'totalRoles' => Role::count(),
                'totalPermissions' => Permission::count(),
            ];

            // Recent Form 1023 Applications
            $recentForm1023Applications = Form1023Application::with(['organization.user'])
                ->latest()
                ->limit(5)
                ->get()
                ->map(function ($app) {
                    return [
                        'id' => $app->id,
                        'application_number' => $app->application_number,
                        'status' => $app->status,
                        'payment_status' => $app->payment_status,
                        'organization_name' => $app->organization->name ?? 'N/A',
                        'submitted_at' => $app->submitted_at?->toIso8601String(),
                        'amount' => $app->amount,
                    ];
                });

            // Recent Organizations
            $recentOrganizations = Organization::with('user')
                ->latest()
                ->limit(5)
                ->get()
                ->map(function ($org) {
                    return [
                        'id' => $org->id,
                        'name' => $org->name,
                        'registration_status' => $org->registration_status,
                        'created_at' => $org->created_at->toIso8601String(),
                    ];
                });




            // Payment Statistics - Include Fractional Ownership revenue
            $form1023Revenue = Form1023Application::where('payment_status', 'paid')->sum('amount');
            $complianceRevenue = ComplianceApplication::where('payment_status', 'paid')->sum('amount');
            $fractionalRevenue = FractionalOrder::where('status', 'paid')->sum('amount');

            $paymentStats = [
                'totalRevenue' => $form1023Revenue + $complianceRevenue + $fractionalRevenue,
                'pendingPayments' => Form1023Application::where('payment_status', 'pending')->sum('amount') +
                                    ComplianceApplication::where('payment_status', 'pending')->sum('amount'),
                'paidApplications' => Form1023Application::where('payment_status', 'paid')->count() +
                                     ComplianceApplication::where('payment_status', 'paid')->count(),
            ];

            // Monthly Revenue Data (Last 6 months)
            $monthlyRevenue = [];
            for ($i = 5; $i >= 0; $i--) {
                $date = Carbon::now()->subMonths($i);
                $startOfMonth = $date->copy()->startOfMonth();
                $endOfMonth = $date->copy()->endOfMonth();

                $monthForm1023 = Form1023Application::where('payment_status', 'paid')
                    ->whereBetween('submitted_at', [$startOfMonth, $endOfMonth])
                    ->sum('amount');

                $monthCompliance = ComplianceApplication::where('payment_status', 'paid')
                    ->whereBetween('created_at', [$startOfMonth, $endOfMonth])
                    ->sum('amount');

                $monthFractional = FractionalOrder::where('status', 'paid')
                    ->whereBetween('paid_at', [$startOfMonth, $endOfMonth])
                    ->sum('amount');

                $monthlyRevenue[] = [
                    'month' => $date->format('M Y'),
                    'monthShort' => $date->format('M'),
                    'revenue' => $monthForm1023 + $monthCompliance + $monthFractional,
                ];
            }

            // Recent Transactions - Combine Form1023, Compliance, and Fractional Orders
            $recentTransactions = collect();

            // Form 1023 Applications
            $form1023Transactions = Form1023Application::with(['organization.user'])
                ->where('payment_status', 'paid')
                ->latest('submitted_at')
                ->limit(10)
                ->get()
                ->map(function ($app) {
                    return [
                        'id' => 'form1023_' . $app->id,
                        'type' => 'Form 1023',
                        'description' => $app->application_number . ' - ' . ($app->organization->name ?? 'N/A'),
                        'amount' => $app->amount,
                        'status' => 'completed',
                        'user_name' => $app->organization->user->name ?? 'N/A',
                        'date' => $app->submitted_at?->toIso8601String(),
                        'currency' => 'USD',
                    ];
                });

            // Compliance Applications
            $complianceTransactions = ComplianceApplication::with(['organization.user'])
                ->where('payment_status', 'paid')
                ->latest('created_at')
                ->limit(10)
                ->get()
                ->map(function ($app) {
                    return [
                        'id' => 'compliance_' . $app->id,
                        'type' => 'Compliance',
                        'description' => 'Compliance Application - ' . ($app->organization->name ?? 'N/A'),
                        'amount' => $app->amount,
                        'status' => 'completed',
                        'user_name' => $app->organization->user->name ?? 'N/A',
                        'date' => $app->created_at->toIso8601String(),
                        'currency' => 'USD',
                    ];
                });

            // Fractional Orders
            $fractionalTransactions = FractionalOrder::with(['user', 'offering'])
                ->where('status', 'paid')
                ->latest('paid_at')
                ->limit(10)
                ->get()
                ->map(function ($order) {
                    return [
                        'id' => 'fractional_' . $order->id,
                        'type' => 'Fractional Ownership',
                        'description' => $order->offering->title . ' - Order ' . ($order->order_number ?? '#' . $order->id),
                        'amount' => $order->amount,
                        'status' => 'completed',
                        'user_name' => $order->user->name ?? 'N/A',
                        'date' => $order->paid_at?->toIso8601String(),
                        'currency' => $order->offering->currency ?? 'USD',
                    ];
                });

            // Combine and sort by date
            $recentTransactions = $form1023Transactions
                ->concat($complianceTransactions)
                ->concat($fractionalTransactions)
                ->sortByDesc('date')
                ->take(10)
                ->values();

            // Promotional banners are only shown for organization users, not admins
            return Inertia::render('dashboard', [
                'isAdmin' => true,
                'stats' => $stats,
                'recentForm1023Applications' => $recentForm1023Applications,
                'recentOrganizations' => $recentOrganizations,
                'paymentStats' => $paymentStats,
                'recentTransactions' => $recentTransactions,
                'monthlyRevenue' => $monthlyRevenue,
                'promotionalBanner' => null,
                'promotionalBanners' => null,
            ]);
        }

        // Organization User Dashboard
        $organization = $user->organization ?? null;
        $totalFav = 0;
        $volunteers = 0;
        $donations = 0;
        $events = 0;

        if ($organization) {
            $organization = $this->refreshComplianceIfNeeded($organization);
            $totalFav = UserFavoriteOrganization::where('organization_id', $organization->id)->count();

            // 1. Total Volunteers Count (approved only)
            $jobPosts = JobPost::where('organization_id', $organization->id)->pluck('id');
            if ($jobPosts->isNotEmpty()) {
                $volunteers = JobApplication::whereIn('job_post_id', $jobPosts)
                    ->where('status', 'accepted')
                    ->count();
            }

            // 2. Total Donations Count
            $donations = Donation::where('organization_id', $organization->id)
                ->where('status', 'completed')
                ->count();

            // 3. Total Events Count
            $events = Event::where('organization_id', $organization->id)->count();
        }

        $user->load('interestedTopics');

        // Get latest Form 1023 application status
        $form1023Application = null;
        if ($organization) {
            $latestApplication = $organization->form1023Applications()
                ->latest()
                ->first();

            if ($latestApplication) {
                $form1023Application = [
                    'id' => $latestApplication->id,
                    'application_number' => $latestApplication->application_number,
                    'status' => $latestApplication->status,
                    'payment_status' => $latestApplication->payment_status,
                    'submitted_at' => $latestApplication->submitted_at?->toIso8601String(),
                    'amount' => $latestApplication->amount,
                ];
            }
        }

        // Get all active promotional banners for carousel
        $promotionalBanners = PromotionalBanner::getActiveBanners();
        $promotionalBanner = $promotionalBanners->first(); // For backward compatibility

        // Get Form 990 filing status
        $form990Filings = null;
        $overdueForm990Filings = [];
        if ($organization) {
            $currentYear = (string) Carbon::now()->year;
            $overdueFilings = $organization->getOverdueForm990Filings();

            $overdueForm990Filings = $overdueFilings->map(function ($filing) {
                return [
                    'id' => $filing->id,
                    'tax_year' => $filing->tax_year,
                    'form_type' => $filing->form_type ?? '990',
                    'due_date' => $filing->due_date?->toIso8601String(),
                    'extended_due_date' => $filing->extended_due_date?->toIso8601String(),
                    'is_filed' => $filing->is_filed,
                    'days_until_due' => $filing->daysUntilDue(),
                    'is_overdue' => $filing->isOverdue(),
                ];
            })->toArray();

            // Get latest filing status
            $latestFiling = $organization->getLatestForm990Filing();
            if ($latestFiling) {
                $form990Filings = [
                    'id' => $latestFiling->id,
                    'tax_year' => $latestFiling->tax_year,
                    'form_type' => $latestFiling->form_type ?? '990',
                    'filing_date' => $latestFiling->filing_date?->toIso8601String(),
                    'is_filed' => $latestFiling->is_filed,
                    'due_date' => $latestFiling->due_date?->toIso8601String(),
                    'extended_due_date' => $latestFiling->extended_due_date?->toIso8601String(),
                    'is_overdue' => $latestFiling->isOverdue(),
                    'days_until_due' => $latestFiling->daysUntilDue(),
                    'last_checked_at' => $latestFiling->last_checked_at?->toIso8601String(),
                ];
            }
        }

        return Inertia::render('dashboard', [
            'isAdmin' => false,
            'totalOrg' => 0,
            'orgInfo' => $organization ?? null,
            'totalFav' => $totalFav ?? 0,
            'volunteers' => $volunteers ?? 0,
            'donations' => $donations ?? 0,
            'events' => $events ?? 0,
            'form1023Application' => $form1023Application,
            'form990Filings' => $form990Filings,
            'overdueForm990Filings' => $overdueForm990Filings,
            'promotionalBanner' => $promotionalBanner ? (function() use ($promotionalBanner) {
                $imageUrl = $promotionalBanner->image_url;
                // Convert path to full URL if needed
                if ($imageUrl) {
                    $baseUrl = \Illuminate\Support\Facades\Storage::disk('public')->url('');
                    if (strpos($imageUrl, $baseUrl) !== 0) {
                        // It's a path, convert to full URL
                        $imageUrl = \Illuminate\Support\Facades\Storage::disk('public')->url($imageUrl);
                    }
                }
                return [
                    'id' => $promotionalBanner->id,
                    'title' => $promotionalBanner->title,
                    'type' => $promotionalBanner->type,
                    'image_url' => $imageUrl,
                    'text_content' => $promotionalBanner->text_content,
                    'external_link' => $promotionalBanner->external_link,
                    'background_color' => $promotionalBanner->background_color,
                    'text_color' => $promotionalBanner->text_color,
                    'description' => $promotionalBanner->description,
                ];
            })() : null,
            'promotionalBanners' => $promotionalBanners->map(function ($banner) {
                return [
                    'id' => $banner->id,
                    'title' => $banner->title,
                    'type' => $banner->type,
                    'image_url' => $banner->image_url,
                    'text_content' => $banner->text_content,
                    'external_link' => $banner->external_link,
                    'background_color' => $banner->background_color,
                    'text_color' => $banner->text_color,
                    'description' => $banner->description,
                ];
            })->toArray(),
            'topics' => $user->interestedTopics->map(function ($topic) {
                return [
                    'id' => $topic->id,
                    'name' => $topic->name,
                ];
            }),
        ]);
    }


    public function getUserTopic(Request $request)
    {
        return $request->user()->interestedTopics()->get();
    }

    public function destroyUserTopic(Request $request, $topicId)
    {
        $request->user()->interestedTopics()->detach($topicId);

        return redirect()->back()->with('success', 'Topic removed successfully');
    }

    private function refreshComplianceIfNeeded(Organization $organization): Organization
    {
        $shouldRefresh = !$organization->tax_compliance_checked_at
            || $organization->tax_compliance_checked_at->lte(Carbon::now()->subDay());

        if (!$shouldRefresh) {
            $this->syncOrganizationOwnerRole($organization);
            return $organization;
        }

        $evaluation = $this->taxComplianceService->evaluate($organization->tax_period, $organization->ein);

        $organization->tax_compliance_status = $evaluation['status'];
        $organization->tax_compliance_checked_at = $evaluation['checked_at'];
        $organization->tax_compliance_meta = $evaluation['meta'];
        $organization->is_compliance_locked = $evaluation['should_lock'];

        if ($evaluation['should_lock']) {
            $organization->status = 'Inactive';
            if ($organization->registration_status === 'approved') {
                $organization->registration_status = 'pending';
            }
        } else {
            if ($organization->status === 'Inactive') {
                $organization->status = 'Active';
            }
            if ($organization->registration_status === 'pending') {
                $organization->registration_status = 'approved';
            }
        }

        if ($organization->isDirty([
            'tax_compliance_status',
            'tax_compliance_checked_at',
            'tax_compliance_meta',
            'is_compliance_locked',
            'status',
            'registration_status',
        ])) {
            $organization->save();
            $organization->refresh();
        }

        $this->syncOrganizationOwnerRole($organization);

        return $organization;
    }

    private function syncOrganizationOwnerRole(Organization $organization): void
    {
        $user = $organization->user;

        if (!$user) {
            return;
        }

        // Check if there's an approved Form 1023 application
        // If approved, user should have organization role
        $hasApprovedForm1023 = $organization->form1023Applications()
            ->where('status', 'approved')
            ->exists();

        // If there's an approved Form 1023 application, ensure user has organization role
        if ($hasApprovedForm1023) {
            if (!$user->hasRole('organization') || $user->role !== 'organization') {
                $organizationRole = Role::firstOrCreate(
                    ['name' => 'organization', 'guard_name' => 'web']
                );

                // Remove organization_pending role if it exists
                if ($user->hasRole('organization_pending')) {
                    $user->removeRole('organization_pending');
                }

                $user->syncRoles([$organizationRole]);
                $user->role = 'organization';
                $user->save();

                // Ensure registration_status is approved
                if ($organization->registration_status !== 'approved') {
                    $organization->registration_status = 'approved';
                    $organization->save();
                }
            }
            return;
        }

        // Check if there's a Form 1023 application in progress
        // If so, keep organization role even if registration_status is pending
        $hasForm1023Application = $organization->form1023Applications()
            ->whereIn('status', ['draft', 'pending_payment', 'awaiting_review', 'needs_more_info'])
            ->exists();

        // If user has organization role and has Form 1023 application, keep it
        if ($hasForm1023Application && $user->hasRole('organization')) {
            // Don't change the role - keep organization role
            if ($user->role !== 'organization') {
                $user->role = 'organization';
                $user->save();
            }
            return;
        }

        $targetRole = ($organization->registration_status === 'approved' && !$organization->is_compliance_locked)
            ? 'organization'
            : 'organization_pending';

        Role::findOrCreate($targetRole);

        if ($user->hasRole($targetRole) && $user->roles()->count() === 1 && $user->role === $targetRole) {
            return;
        }

        $user->syncRoles([$targetRole]);

        if ($user->role !== $targetRole) {
            $user->role = $targetRole;
            $user->save();
        }
    }
}
