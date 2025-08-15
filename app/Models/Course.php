<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;
use App\Models\User;
use App\Models\Meeting;
use App\Models\MeetingLink;
use App\Models\Enrollment;

class Course extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'topic_id',
        'organization_id',
        'user_id',
        'pricing_type',
        'course_fee',
        'start_date',
        'start_time',
        'end_date',
        'duration',
        'format',
        'max_participants',
        'language',
        'target_audience',
        'community_impact',
        'learning_outcomes',
        'prerequisites',
        'materials_needed',
        'accessibility_features',
        'certificate_provided',
        'volunteer_opportunities',
        'image',
        'enrolled',
        'rating',
        'total_reviews',
        'last_updated'
    ];

    protected $casts = [
        'learning_outcomes' => 'array',
        'prerequisites' => 'array',
        'materials_needed' => 'array',
        'accessibility_features' => 'array',
        'certificate_provided' => 'boolean',
        'volunteer_opportunities' => 'boolean',
        'course_fee' => 'decimal:2',
        'rating' => 'decimal:1',
        'start_date' => 'date:Y-m-d',
        'end_date' => 'date:Y-m-d',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $appends = [
        'image_url',
        'formatted_price',
        'formatted_duration',
        'formatted_format',
        'status',
        'enrollment_status'
    ];

    // Relationships
    public function topic(): BelongsTo
    {
        return $this->belongsTo(Topic::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organization_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    public function activeEnrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class)->where('status', Enrollment::STATUS_ACTIVE);
    }

    // Meeting relationships
    public function meetings(): HasMany
    {
        return $this->hasMany(Meeting::class);
    }

    // Accessors
    public function getImageUrlAttribute()
    {
        if ($this->image && Storage::disk('public')->exists($this->image)) {
            return Storage::disk('public')->url($this->image);
        }
        return null;
    }

    public function getFormattedPriceAttribute()
    {
        if ($this->pricing_type === 'free' || $this->course_fee == 0) {
            return 'Free';
        }
        return '$' . number_format($this->course_fee, 2);
    }

    public function getFormattedDurationAttribute()
    {
        $durations = [
            '1_session' => 'Single Session',
            '1_week' => '1 Week',
            '2_weeks' => '2 Weeks',
            '1_month' => '1 Month',
            '6_weeks' => '6 Weeks',
            '3_months' => '3 Months',
        ];

        return $durations[$this->duration] ?? $this->duration;
    }

    public function getFormattedFormatAttribute()
    {
        $formats = [
            'online' => 'Online',
            'in_person' => 'In-Person',
            'hybrid' => 'Hybrid',
        ];

        return $formats[$this->format] ?? $this->format;
    }

    public function getStatusAttribute()
    {
        $now = now();
        $startDate = Carbon::parse($this->start_date);
        $endDate = $this->end_date ? Carbon::parse($this->end_date) : null;

        if ($startDate->isFuture()) {
            return 'upcoming';
        }

        if ($startDate->isPast() && (!$endDate || $endDate->isFuture())) {
            return 'active';
        }

        if ($endDate && $endDate->isPast()) {
            return 'completed';
        }

        return 'active';
    }

    public function getEnrollmentStatusAttribute()
    {
        $now = now();
        $courseStart = Carbon::parse($this->start_date);

        if ($courseStart->isPast()) {
            return 'started';
        } elseif ($this->enrolled >= $this->max_participants) {
            return 'full';
        } elseif (($this->enrolled / $this->max_participants) >= 0.8) {
            return 'almost_full';
        } else {
            return 'available';
        }
    }

    // Helper methods
    public function isFull(): bool
    {
        return $this->enrolled >= $this->max_participants;
    }

    public function hasAvailableSpots(): bool
    {
        return $this->enrolled < $this->max_participants;
    }

    public function getAvailableSpots(): int
    {
        return max(0, $this->max_participants - $this->enrolled);
    }

    public function getEnrollmentPercentage(): float
    {
        if ($this->max_participants == 0) {
            return 0;
        }
        return round(($this->enrolled / $this->max_participants) * 100, 1);
    }

    public function canEnroll(): bool
    {
        return $this->hasAvailableSpots() && $this->start_date > now();
    }

    public function isEnrollmentOpen(): bool
    {
        return $this->start_date > now();
    }

    public function getTotalRevenue(): float
    {
        if ($this->pricing_type === 'free') {
            return 0;
        }
        return $this->enrolled * $this->course_fee;
    }

    // Check if user is enrolled
    public function isUserEnrolled($userId): bool
    {
        return $this->enrollments()
            ->where('user_id', $userId)
            ->where('status', Enrollment::STATUS_ACTIVE)
            ->exists();
    }

    // Get user's enrollment
    public function getUserEnrollment($userId)
    {
        return $this->enrollments()
            ->where('user_id', $userId)
            ->first();
    }

    // Meeting-related methods
    public function createDefaultMeeting(): Meeting
    {
        $meetingTitle = "Live Session: " . $this->name;

        // Parse date, then set the time correctly
        $scheduledAt = Carbon::parse($this->start_date)
            ->setTimeFromTimeString($this->start_time);

        // Calculate duration based on course duration
        $durationMinutes = match ($this->duration) {
            '1_session' => 90,
            '1_week', '2_weeks' => 120,
            '1_month', '6_weeks', '3_months' => 90,
            default => 90,
        };

        $meeting = $this->meetings()->create([
            'instructor_id' => $this->organization_id,
            'title' => $meetingTitle,
            'description' => "Live session for " . $this->name,
            'meeting_id' => Meeting::generateMeetingId(),
            'scheduled_at' => $scheduledAt,
            'duration_minutes' => $durationMinutes,
            'status' => 'scheduled',
            'max_participants' => $this->max_participants,
            'is_recording_enabled' => true,
            'is_chat_enabled' => true,
            'is_screen_share_enabled' => true,
        ]);

        // Generate meeting links
        $meeting->generateLinks();

        return $meeting;
    }

    public function getActiveMeeting(): ?Meeting
    {
        return $this->meetings()
            ->where('status', 'active')
            ->first();
    }

    public function getUpcomingMeetings()
    {
        return $this->meetings()
            ->where('status', 'scheduled')
            ->where('scheduled_at', '>', now())
            ->orderBy('scheduled_at', 'asc')
            ->get();
    }

    public function generateMeetingLinksForNewEnrollment(User $user): void
    {
        try {
            // First, ensure we have at least one meeting for this course
            if ($this->meetings()->count() === 0) {
                $this->createDefaultMeeting();
            }

            // Generate student links for all scheduled meetings
            $scheduledMeetings = $this->meetings()
                ->where('status', 'scheduled')
                ->get();

            foreach ($scheduledMeetings as $meeting) {
                // Check if link already exists
                $existingLink = $meeting->meetingLinks()
                    ->where('user_id', $user->id)
                    ->where('role', 'student')
                    ->where('is_active', true)
                    ->first();

                if (!$existingLink) {
                    MeetingLink::generateStudentLink($meeting, $user);
                }
            }

            // Also ensure all previously enrolled users have links for new meetings
            $this->ensureMeetingLinksForAllEnrolledUsers();
        } catch (\Exception $e) {
            \Log::error('Failed to generate meeting links for enrollment', [
                'course_id' => $this->id,
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    public function deactivateMeetingLinksForUser(User $user): void
    {
        try {
            // Deactivate all meeting links for this user in this course
            $meetingIds = $this->meetings()->pluck('id');

            MeetingLink::whereIn('meeting_id', $meetingIds)
                ->where('user_id', $user->id)
                ->update(['is_active' => false]);
        } catch (\Exception $e) {
            \Log::error('Failed to deactivate meeting links for user', [
                'course_id' => $this->id,
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Ensure all enrolled users have meeting links for all scheduled meetings
     */
    public function ensureMeetingLinksForAllEnrolledUsers(): void
    {
        try {
            $enrolledUsers = $this->activeEnrollments()
                ->with('user')
                ->get()
                ->pluck('user');

            $scheduledMeetings = $this->meetings()
                ->where('status', 'scheduled')
                ->get();

            foreach ($enrolledUsers as $user) {
                foreach ($scheduledMeetings as $meeting) {
                    $existingLink = $meeting->meetingLinks()
                        ->where('user_id', $user->id)
                        ->where('role', 'student')
                        ->where('is_active', true)
                        ->first();

                    if (!$existingLink) {
                        MeetingLink::generateStudentLink($meeting, $user);
                    }
                }
            }
        } catch (\Exception $e) {
            \Log::error('Failed to ensure meeting links for all enrolled users', [
                'course_id' => $this->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Get meeting links for a specific user
     */
    public function getMeetingLinksForUser(User $user): array
    {
        $meetingLinks = [];

        try {
            $meetings = $this->meetings()
                ->where('status', 'scheduled')
                ->orderBy('scheduled_at', 'asc')
                ->get();

            foreach ($meetings as $meeting) {
                $studentLink = $meeting->getStudentLink($user);
                if ($studentLink && $studentLink->is_active) {
                    $meetingLinks[] = [
                        'meeting' => $meeting,
                        'join_url' => $studentLink->getJoinUrl(),
                        'link_id' => $studentLink->id,
                        'expires_at' => $studentLink->expires_at,
                    ];
                }
            }
        } catch (\Exception $e) {
            \Log::error('Failed to get meeting links for user', [
                'course_id' => $this->id,
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
        }

        return $meetingLinks;
    }
}
