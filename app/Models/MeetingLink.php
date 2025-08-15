<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use Carbon\Carbon;

class MeetingLink extends Model
{
    use HasFactory;

    protected $fillable = [
        'meeting_id',
        'user_id',
        'token',
        'role',
        'expires_at',
        'is_active',
        'access_count',
        'last_accessed_at',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'last_accessed_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    // Relationships
    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Static methods for link generation
    public static function generateHostLink(Meeting $meeting): self
    {
        return self::create([
            'meeting_id' => $meeting->id,
            'user_id' => $meeting->instructor_id,
            'token' => self::generateSecureToken(),
            'role' => 'host',
            'expires_at' => now()->addHours(6),
            'is_active' => true,
        ]);
    }

    public static function generateStudentLink(Meeting $meeting, User $user): self
    {
        return self::create([
            'meeting_id' => $meeting->id,
            'user_id' => $user->id,
            'token' => self::generateSecureToken(),
            'role' => 'student',
            'expires_at' => now()->addHours(4),
            'is_active' => true,
        ]);
    }

    public static function generateOrganizationLink(Meeting $meeting, User $user): self
    {
        return self::create([
            'meeting_id' => $meeting->id,
            'user_id' => $user->id,
            'token' => self::generateSecureToken(),
            'role' => 'organization',
            'expires_at' => now()->addHours(6),
            'is_active' => true,
        ]);
    }

    public static function generateUserLink(Meeting $meeting, User $user): self
    {
        return self::create([
            'meeting_id' => $meeting->id,
            'user_id' => $user->id,
            'token' => self::generateSecureToken(),
            'role' => 'user',
            'expires_at' => now()->addHours(4),
            'is_active' => true,
        ]);
    }

    public static function generateSecureToken(): string
    {
        $randomString = Str::random(32) . microtime(true) . rand(1000, 9999);
        $hashedToken = hash('sha256', $randomString);
        return base64_encode($hashedToken);
    }

    // Instance methods
    public function getJoinUrl(): string
    {
        return route('meetings.join', ['token' => $this->token]);
    }

    public function isValid(): bool
    {
        return $this->is_active && 
               $this->expires_at->isFuture() && 
               $this->meeting->status !== 'ended';
    }

    public function recordAccess(?string $ipAddress = null, ?string $userAgent = null): void
    {
        $this->update([
            'access_count' => $this->access_count + 1,
            'last_accessed_at' => now(),
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
        ]);
    }

    public function deactivate(): void
    {
        $this->update(['is_active' => false]);
    }

    public function regenerate(): void
    {
        $this->update([
            'token' => self::generateSecureToken(),
            'expires_at' => $this->role === 'host' ? now()->addHours(6) : now()->addHours(4),
            'is_active' => true,
            'access_count' => 0,
            'last_accessed_at' => null,
        ]);
    }
}
