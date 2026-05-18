<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class EmailVerificationCode extends Model
{
    protected $fillable = [
        'user_id',
        'email',
        'code',
        'expires_at',
        'is_used',
        'used_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'used_at' => 'datetime',
        'is_used' => 'boolean',
    ];

    /**
     * Get the user that owns the verification code
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if the code has expired
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Check if the code is valid (not used and not expired)
     */
    public function isValid(): bool
    {
        return !$this->is_used && !$this->isExpired();
    }

    /**
     * Mark the code as used
     */
    public function markAsUsed(): void
    {
        $this->update([
            'is_used' => true,
            'used_at' => now(),
        ]);
    }

    /**
     * Generate a 6-digit verification code
     */
    public static function generateCode(): string
    {
        return str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
    }

    /**
     * Create a new verification code for a user
     */
    public static function createForUser(User $user, ?string $email = null): self
    {
        // Invalidate all previous codes for this email
        static::where('email', $email ?? $user->email)
            ->where('is_used', false)
            ->update(['is_used' => true]);

        // Create new code
        return static::create([
            'user_id' => $user->id,
            'email' => $email ?? $user->email,
            'code' => static::generateCode(),
            'expires_at' => now()->addMinutes(5), // Expires after 5 minutes
        ]);
    }

    /**
     * Find a valid verification code
     */
    public static function findValid(string $email, string $code): ?self
    {
        return static::where('email', $email)
            ->where('code', $code)
            ->where('is_used', false)
            ->where('expires_at', '>', now())
            ->first();
    }
}
