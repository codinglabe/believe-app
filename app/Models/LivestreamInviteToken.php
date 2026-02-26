<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class LivestreamInviteToken extends Model
{
    protected $table = 'livestream_invite_tokens';

    protected $fillable = [
        'organization_livestream_id',
        'token',
    ];

    public function organizationLivestream(): BelongsTo
    {
        return $this->belongsTo(OrganizationLivestream::class, 'organization_livestream_id');
    }

    /**
     * Generate a secure token for invite links.
     */
    public static function generateToken(): string
    {
        return Str::random(48);
    }

    /**
     * Create a new invite token for a livestream and return the token string.
     */
    public static function createForLivestream(OrganizationLivestream $livestream): string
    {
        $token = self::generateToken();
        while (self::where('token', $token)->exists()) {
            $token = self::generateToken();
        }
        self::create([
            'organization_livestream_id' => $livestream->id,
            'token' => $token,
        ]);
        return $token;
    }
}
