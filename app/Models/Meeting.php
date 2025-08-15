<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Meeting extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_id',
        'instructor_id',
        'title',
        'description',
        'meeting_id',
        'scheduled_at',
        'duration_minutes',
        'status',
        'max_participants',
        'is_recording_enabled',
        'is_chat_enabled',
        'is_screen_share_enabled',
        'meeting_password',
        'settings',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'is_recording_enabled' => 'boolean',
        'is_chat_enabled' => 'boolean',
        'is_screen_share_enabled' => 'boolean',
        'settings' => 'array',
    ];

    // Relationships
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function instructor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }

    public function participants(): HasMany
    {
        return $this->hasMany(MeetingParticipant::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function recordings(): HasMany
    {
        return $this->hasMany(Recording::class);
    }

    public function chatMessages(): HasMany
    {
        return $this->hasMany(ChatMessage::class);
    }

    public function meetingLinks(): HasMany
    {
        return $this->hasMany(MeetingLink::class);
    }

    // Static method to generate unique meeting ID
    public static function generateMeetingId(): string
    {
        do {
            $meetingId = 'MTG-' . strtoupper(Str::random(8));
        } while (self::where('meeting_id', $meetingId)->exists());

        return $meetingId;
    }

    // Instance methods
    public function canUserJoin(User $user): bool
    {
        // Instructor can always join
        if ($user->id === $this->instructor_id) {
            return true;
        }

        // Check if user is enrolled in the course
        return $this->course->enrollments()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->exists();
    }

    public function getHostLink(): ?MeetingLink
    {
        return $this->meetingLinks()
            ->where('role', 'host')
            ->where('is_active', true)
            ->where('expires_at', '>', now())
            ->first();
    }

    public function getStudentLink(User $user): ?MeetingLink
    {
        return $this->meetingLinks()
            ->where('user_id', $user->id)
            ->where('role', 'student')
            ->where('is_active', true)
            ->where('expires_at', '>', now())
            ->first();
    }

    public function getOrganizationLink(User $user): ?MeetingLink
    {
        return $this->meetingLinks()
            ->where('user_id', $user->id)
            ->where('role', 'organization')
            ->where('is_active', true)
            ->where('expires_at', '>', now())
            ->first();
    }

    public function getUserLink(User $user): ?MeetingLink
    {
        return $this->meetingLinks()
            ->where('user_id', $user->id)
            ->where('role', 'user')
            ->where('is_active', true)
            ->where('expires_at', '>', now())
            ->first();
    }

    public function generateLinks(): void
    {
        // Generate host link
        MeetingLink::generateHostLink($this);

        // Generate student links for all enrolled users
        $enrolledUsers = $this->course->enrollments()
            ->where('status', 'active')
            ->with('user')
            ->get();

        foreach ($enrolledUsers as $enrollment) {
            MeetingLink::generateStudentLink($this, $enrollment->user);

            // Generate organization or user links based on user role
            dd($enrollment->user->role);
            if ($enrollment->user->role === 'organization') {
                MeetingLink::generateOrganizationLink($this, $enrollment->user);
            } else {
                MeetingLink::generateUserLink($this, $enrollment->user);
            }
        }
    }

    public function start(): void
    {
        $this->update(['status' => 'active']);
        event(new \App\Events\MeetingStarted($this));
    }

    public function end(): void
    {
        $this->update(['status' => 'ended']);

        // Mark all active participants as left
        $this->participants()->where('status', 'joined')->each(function ($participant) {
            $participant->markAsLeft();
        });

        // Complete all active attendances
        $this->attendances()->where('status', 'active')->each(function ($attendance) {
            $attendance->markAsLeft();
        });

        event(new \App\Events\MeetingEnded($this));
    }


    public function addParticipant(User $user, ?string $rollId = null): MeetingParticipant
    {
        // Check if participant already exists
        $participant = $this->participants()->where('user_id', $user->id)->first();

        if ($participant) {
            // Update status if participant exists
            $participant->update([
                'status' => 'joined',
                'joined_at' => now(),
            ]);
        } else {
            // Create new participant
            $participant = $this->participants()->create([
                'user_id' => $user->id,
                'roll_id' => $rollId ?: Str::random(10),
                'status' => 'joined',
                'joined_at' => now(),
            ]);
        }

        // Create or update attendance record
        $attendance = $this->attendances()->updateOrCreate(
            [
                'user_id' => $user->id,
            ],
            [
                'roll_id' => $participant->roll_id,
                'joined_at' => now(),
                'status' => 'active',
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]
        );

        event(new \App\Events\ParticipantJoined($participant));

        return $participant;
    }


    public function removeParticipant(User $user): void
    {
        $participant = $this->participants()
            ->where('user_id', $user->id)
            ->where('status', 'joined')
            ->first();

        if ($participant) {
            $participant->markAsLeft();

            // Complete attendance
            $attendance = $this->attendances()
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->first();

            if ($attendance) {
                $attendance->markAsLeft();
            }
            $participantData = $participant->toArray();
            event(new \App\Events\ParticipantLeft($participantData, $participant->meeting_id));
        }
    }
}
