<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\UserFavoriteOrganization;
use App\Models\User;
use App\Models\Form1023Application;
use App\Models\ComplianceApplication;
use App\Models\Form990Filing;
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

            // Payment Statistics
            $paymentStats = [
                'totalRevenue' => Form1023Application::where('payment_status', 'paid')->sum('amount') +
                                 ComplianceApplication::where('payment_status', 'paid')->sum('amount'),
                'pendingPayments' => Form1023Application::where('payment_status', 'pending')->sum('amount') +
                                    ComplianceApplication::where('payment_status', 'pending')->sum('amount'),
                'paidApplications' => Form1023Application::where('payment_status', 'paid')->count() +
                                     ComplianceApplication::where('payment_status', 'paid')->count(),
            ];

            return Inertia::render('dashboard', [
                'isAdmin' => true,
                'stats' => $stats,
                'recentForm1023Applications' => $recentForm1023Applications,
                'recentOrganizations' => $recentOrganizations,
                'paymentStats' => $paymentStats,
            ]);
        }

        // Organization User Dashboard (existing logic)
        $organization = $user->organization ?? null;
        $totalFav = 0;
        
        if ($organization) {
            $organization = $this->refreshComplianceIfNeeded($organization);
            $totalFav = UserFavoriteOrganization::where('organization_id', $organization->id)->count();
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
            'form1023Application' => $form1023Application,
            'form990Filings' => $form990Filings,
            'overdueForm990Filings' => $overdueForm990Filings,
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
