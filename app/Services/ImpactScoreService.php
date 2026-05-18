<?php

namespace App\Services;

use App\Models\ImpactPoint;
use App\Models\User;
use App\Models\VolunteerTimesheet;
use App\Models\Donation;
use App\Models\UserFavoriteOrganization;
use Carbon\Carbon;

class ImpactScoreService
{
    // Point weights as per specification
    const VOLUNTEER_HOUR_POINTS = 50; // 50 IP per hour
    const CRITICAL_SERVICE_BONUS = 15; // +15 IP per hour for critical services
    const DONATION_MULTIPLIER = 0.55; // 0.55 IP per dollar
    const FOLLOW_POINTS = 1; // 1 IP per follow
    const SHARE_POINTS = 3; // 3 IP per share (future)
    const REFERRAL_POINTS = 15; // 15 IP per verified referral (future)
    const REVIEW_POINTS = 8; // 8 IP per positive review (future)

    // Bonus points
    const CONSISTENCY_BONUS = 250; // +250 IP/month for 3 consecutive months
    const EVENT_PARTICIPATION_BONUS = 100; // +100 IP per event
    const IMPACT_REFERRAL_BONUS = 200; // +200 IP for referral with 10+ hours
    const RWA_PARTICIPATION_BONUS = 150; // +150 IP for RWA token purchase

    /**
     * Award points for volunteer hours.
     */
    public function awardVolunteerPoints(VolunteerTimesheet $timesheet): void
    {
        $user = $timesheet->jobApplication->user;
        $hours = (float) $timesheet->hours;
        
        // Base points: hours × 50
        $basePoints = $hours * self::VOLUNTEER_HOUR_POINTS;
        
        // Check if it's a critical service (can be determined by job post title or category)
        $isCriticalService = $this->isCriticalService($timesheet);
        $bonusPoints = 0;
        
        if ($isCriticalService) {
            $bonusPoints = $hours * self::CRITICAL_SERVICE_BONUS;
        }
        
        $totalPoints = $basePoints + $bonusPoints;
        
        ImpactPoint::create([
            'user_id' => $user->id,
            'source_type' => 'volunteer',
            'source_id' => $timesheet->id,
            'points' => $totalPoints,
            'description' => "Volunteered {$hours} hours" . ($isCriticalService ? ' (Critical Service)' : ''),
            'metadata' => [
                'hours' => $hours,
                'is_critical_service' => $isCriticalService,
                'base_points' => $basePoints,
                'bonus_points' => $bonusPoints,
            ],
            'activity_date' => $timesheet->work_date,
        ]);
    }

    /**
     * Award points for a donation.
     */
    public function awardDonationPoints(Donation $donation): void
    {
        // Only award points for completed donations
        if ($donation->status !== 'completed') {
            return;
        }

        $amount = (float) $donation->amount;
        $points = $amount * self::DONATION_MULTIPLIER;
        
        ImpactPoint::create([
            'user_id' => $donation->user_id,
            'source_type' => 'donation',
            'source_id' => $donation->id,
            'points' => $points,
            'description' => "Donated $" . number_format($amount, 2),
            'metadata' => [
                'amount' => $amount,
                'organization_id' => $donation->organization_id,
            ],
            'activity_date' => $donation->donation_date ?? now(),
        ]);
    }

    /**
     * Award points for following an organization.
     */
    public function awardFollowPoints(UserFavoriteOrganization $favorite): void
    {
        ImpactPoint::create([
            'user_id' => $favorite->user_id,
            'source_type' => 'follow',
            'source_id' => $favorite->id,
            'points' => self::FOLLOW_POINTS,
            'description' => 'Followed organization',
            'metadata' => [
                'organization_id' => $favorite->organization_id,
            ],
            'activity_date' => $favorite->created_at->toDateString(),
        ]);
    }

    /**
     * Remove points when a timesheet is deleted.
     */
    public function removeVolunteerPoints(VolunteerTimesheet $timesheet): void
    {
        ImpactPoint::where('source_type', 'volunteer')
            ->where('source_id', $timesheet->id)
            ->delete();
    }

    /**
     * Remove points when a donation is cancelled/refunded.
     */
    public function removeDonationPoints(Donation $donation): void
    {
        ImpactPoint::where('source_type', 'donation')
            ->where('source_id', $donation->id)
            ->delete();
    }

    /**
     * Remove points when unfollowing an organization.
     */
    public function removeFollowPoints(UserFavoriteOrganization $favorite): void
    {
        ImpactPoint::where('source_type', 'follow')
            ->where('source_id', $favorite->id)
            ->delete();
    }

    /**
     * Calculate impact score for a user within a time window.
     */
    public function calculateImpactScore(User $user, string $period = 'monthly'): array
    {
        $startDate = $this->getPeriodStartDate($period);
        $endDate = now();
        
        $points = ImpactPoint::where('user_id', $user->id)
            ->whereBetween('activity_date', [$startDate, $endDate])
            ->get();
        
        // Calculate points by category
        $volunteerPoints = $points->where('source_type', 'volunteer')->sum('points');
        $donationPoints = $points->where('source_type', 'donation')->sum('points');
        $followPoints = $points->where('source_type', 'follow')->sum('points');
        $bonusPoints = $points->where('source_type', 'bonus')->sum('points');
        
        $totalPoints = $volunteerPoints + $donationPoints + $followPoints + $bonusPoints;
        
        // Calculate final score (divide by time window)
        $daysInPeriod = $this->getDaysInPeriod($period);
        $impactScore = $daysInPeriod > 0 ? $totalPoints / $daysInPeriod : 0;
        
        // Get badge level
        $badge = $this->getBadgeLevel($totalPoints, $period);
        
        return [
            'total_points' => round($totalPoints, 2),
            'impact_score' => round($impactScore, 2),
            'volunteer_points' => round($volunteerPoints, 2),
            'donation_points' => round($donationPoints, 2),
            'follow_points' => round($followPoints, 2),
            'bonus_points' => round($bonusPoints, 2),
            'badge' => $badge,
            'period' => $period,
            'start_date' => $startDate->toDateString(),
            'end_date' => $endDate->toDateString(),
        ];
    }

    /**
     * Get breakdown of points by category.
     */
    public function getPointsBreakdown(User $user, string $period = 'monthly'): array
    {
        $startDate = $this->getPeriodStartDate($period);
        $endDate = now();
        
        $points = ImpactPoint::where('user_id', $user->id)
            ->whereBetween('activity_date', [$startDate, $endDate])
            ->get();
        
        return [
            'volunteer' => [
                'points' => round($points->where('source_type', 'volunteer')->sum('points'), 2),
                'count' => $points->where('source_type', 'volunteer')->count(),
            ],
            'donation' => [
                'points' => round($points->where('source_type', 'donation')->sum('points'), 2),
                'count' => $points->where('source_type', 'donation')->count(),
            ],
            'follow' => [
                'points' => round($points->where('source_type', 'follow')->sum('points'), 2),
                'count' => $points->where('source_type', 'follow')->count(),
            ],
            'bonus' => [
                'points' => round($points->where('source_type', 'bonus')->sum('points'), 2),
                'count' => $points->where('source_type', 'bonus')->count(),
            ],
        ];
    }

    /**
     * Get badge level based on total points.
     */
    private function getBadgeLevel(float $totalPoints, string $period = 'monthly'): array
    {
        // Badge thresholds are for monthly scores
        if ($period !== 'monthly') {
            // Convert to monthly equivalent for comparison
            $daysInPeriod = $this->getDaysInPeriod($period);
            $totalPoints = ($totalPoints / $daysInPeriod) * 30;
        }
        
        if ($totalPoints >= 5001) {
            return ['name' => 'Legacy Champion', 'level' => 5, 'emoji' => '🟫', 'color' => '#8B4513'];
        } elseif ($totalPoints >= 2501) {
            return ['name' => 'Change Maker', 'level' => 4, 'emoji' => '🟧', 'color' => '#FF8C00'];
        } elseif ($totalPoints >= 1001) {
            return ['name' => 'Impact Leader', 'level' => 3, 'emoji' => '🟨', 'color' => '#FFD700'];
        } elseif ($totalPoints >= 301) {
            return ['name' => 'Community Builder', 'level' => 2, 'emoji' => '🟩', 'color' => '#32CD32'];
        } else {
            return ['name' => 'Supporter', 'level' => 1, 'emoji' => '🟦', 'color' => '#4169E1'];
        }
    }

    /**
     * Get start date for the period.
     */
    private function getPeriodStartDate(string $period): Carbon
    {
        return match ($period) {
            'monthly' => now()->startOfMonth(),
            'quarterly' => now()->startOfQuarter(),
            'annual' => now()->startOfYear(),
            default => now()->startOfMonth(),
        };
    }

    /**
     * Get number of days in the period.
     */
    private function getDaysInPeriod(string $period): int
    {
        return match ($period) {
            'monthly' => 30,
            'quarterly' => 90,
            'annual' => 365,
            default => 30,
        };
    }

    /**
     * Check if volunteer service is critical.
     * You can customize this logic based on job post categories or titles.
     */
    private function isCriticalService(VolunteerTimesheet $timesheet): bool
    {
        $jobPost = $timesheet->jobApplication->jobPost ?? null;
        
        if (!$jobPost) {
            return false;
        }
        
        $title = strtolower($jobPost->title ?? '');
        $description = strtolower($jobPost->description ?? '');
        
        $criticalKeywords = [
            'youth', 'elderly', 'senior', 'food distribution', 'hunger', 'homeless',
            'emergency', 'disaster', 'healthcare', 'medical', 'education', 'tutoring'
        ];
        
        foreach ($criticalKeywords as $keyword) {
            if (str_contains($title, $keyword) || str_contains($description, $keyword)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Award consistency bonus if user volunteered 3 months in a row.
     */
    public function checkAndAwardConsistencyBonus(User $user): void
    {
        $lastThreeMonths = collect();
        for ($i = 0; $i < 3; $i++) {
            $month = now()->subMonths($i);
            $hasVolunteerHours = VolunteerTimesheet::whereHas('jobApplication', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            })
            ->whereYear('work_date', $month->year)
            ->whereMonth('work_date', $month->month)
            ->exists();
            
            $lastThreeMonths->push($hasVolunteerHours);
        }
        
        // If all 3 months have volunteer hours
        if ($lastThreeMonths->every(fn($has) => $has)) {
            // Check if bonus already awarded this month
            $hasBonus = ImpactPoint::where('user_id', $user->id)
                ->where('source_type', 'bonus')
                ->where('description', 'LIKE', '%Consistency Bonus%')
                ->whereYear('activity_date', now()->year)
                ->whereMonth('activity_date', now()->month)
                ->exists();
            
            if (!$hasBonus) {
                ImpactPoint::create([
                    'user_id' => $user->id,
                    'source_type' => 'bonus',
                    'source_id' => null,
                    'points' => self::CONSISTENCY_BONUS,
                    'description' => 'Consistency Bonus: Volunteered 3 months in a row',
                    'metadata' => ['type' => 'consistency'],
                    'activity_date' => now(),
                ]);
            }
        }
    }
}
