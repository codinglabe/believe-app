<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VolunteerAssessment extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'submission_id',
        'timesheet_id',
        'nonprofit_id',
        'grade',
        'multiplier',
        'final_points',
        'review_notes',
        'reviewed_by',
        'reviewed_at',
    ];

    /**
     * Get the timesheet associated with this assessment.
     */
    public function timesheet()
    {
        return $this->belongsTo(VolunteerTimesheet::class, 'timesheet_id');
    }

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'multiplier' => 'decimal:2',
        'final_points' => 'integer',
        'reviewed_at' => 'datetime',
    ];

    /**
     * Grade multipliers mapping (as per platform rules)
     * 
     * @var array<string, float>
     */
    public const GRADE_MULTIPLIERS = [
        'excellent' => 1.00,        // 100%
        'good' => 0.80,              // 80%
        'acceptable' => 0.60,        // 60%
        'needs_improvement' => 0.25, // 25%
        'rejected' => 0.00,          // 0%
    ];

    /**
     * Get the nonprofit organization that created this assessment.
     */
    public function nonprofit(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'nonprofit_id');
    }

    /**
     * Get the user who reviewed this assessment.
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /**
     * Calculate final points based on base points and grade multiplier.
     * 
     * @param int $basePoints The base points set by nonprofit for the task
     * @param string $grade The grade assigned (excellent, good, acceptable, needs_improvement, rejected)
     * @return int The calculated final points
     */
    public static function calculateFinalPoints(int $basePoints, string $grade): int
    {
        $multiplier = self::GRADE_MULTIPLIERS[strtolower($grade)] ?? 0.00;
        return (int) round($basePoints * $multiplier);
    }

    /**
     * Get the multiplier for a given grade.
     * 
     * @param string $grade
     * @return float
     */
    public static function getMultiplierForGrade(string $grade): float
    {
        return self::GRADE_MULTIPLIERS[strtolower($grade)] ?? 0.00;
    }

    /**
     * Check if the assessment is completed.
     * 
     * @return bool
     */
    public function isCompleted(): bool
    {
        return $this->reviewed_at !== null && $this->grade !== null;
    }

    /**
     * Get all valid grades.
     * 
     * @return array<string>
     */
    public static function getValidGrades(): array
    {
        return array_keys(self::GRADE_MULTIPLIERS);
    }
}
