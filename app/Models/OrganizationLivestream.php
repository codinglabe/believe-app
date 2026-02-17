<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

class OrganizationLivestream extends Model
{
    use HasFactory;

    protected $table = 'org_livestreams';

    protected $fillable = [
        'organization_id',
        'room_name',
        'room_password',
        'youtube_stream_key',
        'youtube_broadcast_id',
        'status',
        'title',
        'description',
        'scheduled_at',
        'started_at',
        'ended_at',
        'settings',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'settings' => 'array',
    ];

    /**
     * Get the organization that owns this livestream.
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /** VDO.Ninja room name max length (they allow &lt; 31). */
    private const VDO_ROOM_NAME_MAX_LENGTH = 30;

    /**
     * Generate a unique room name for an organization.
     * Every new livestream gets a new room name (random suffix). Never reuse a name.
     * VDO.Ninja: alphanumeric only, max 31 chars — we keep to 30.
     */
    public static function generateRoomName(Organization $organization): string
    {
        $slug = Str::slug($organization->name, '_');
        $clean = preg_replace('/[^a-zA-Z0-9_]/', '_', $slug);
        $clean = trim($clean, '_') ?: 'room';
        // believe_ (8) + _ (1) + random(8) = 17, so base part max 30 - 17 = 13
        $base = 'believe_' . substr($clean, 0, 13);
        $base = trim($base, '_') ?: 'believe_room';

        $roomName = $base . '_' . Str::random(8);
        $roomName = substr($roomName, 0, self::VDO_ROOM_NAME_MAX_LENGTH);
        while (self::where('room_name', $roomName)->exists()) {
            $roomName = $base . '_' . Str::random(8);
            $roomName = substr($roomName, 0, self::VDO_ROOM_NAME_MAX_LENGTH);
        }

        return $roomName;
    }

    /**
     * Generate a random 8-character password.
     */
    public static function generatePassword(): string
    {
        return Str::random(8);
    }

    /**
     * Get the encrypted password.
     */
    public function getEncryptedPassword(): string
    {
        return Crypt::encryptString($this->room_password);
    }

    /**
     * Decrypt and get the password.
     */
    public function getDecryptedPassword(): string
    {
        try {
            return Crypt::decryptString($this->room_password);
        } catch (\Exception $e) {
            return $this->room_password; // Fallback if not encrypted
        }
    }

    /**
     * Get the encrypted YouTube stream key.
     */
    public function getEncryptedStreamKey(): ?string
    {
        if (!$this->youtube_stream_key) {
            return null;
        }
        return Crypt::encryptString($this->youtube_stream_key);
    }

    /**
     * Decrypt and get the YouTube stream key.
     */
    public function getDecryptedStreamKey(): ?string
    {
        if (!$this->youtube_stream_key) {
            return null;
        }
        try {
            return Crypt::decryptString($this->youtube_stream_key);
        } catch (\Exception $e) {
            return $this->youtube_stream_key; // Fallback if not encrypted
        }
    }

    /**
     * Room name safe for VDO.Ninja (alphanumeric + underscore only, max 31 chars).
     */
    public function getVdoRoomName(): string
    {
        $safe = preg_replace('/[^a-zA-Z0-9_]/', '_', $this->room_name);
        $safe = trim($safe, '_') ?: 'room';
        return substr($safe, 0, self::VDO_ROOM_NAME_MAX_LENGTH);
    }

    /**
     * Get the VDO.Ninja director URL.
     * Use only &director= (not &room=); VDO.Ninja says "there should be only &director OR &room".
     * &clearstorage clears any saved session so the "load previous session?" prompt won't offer the old bad URL.
     * &label= set to organization name so the director does not need to enter a name manually.
     * &cleandirector = cleaner control center; &slotmode + &layouts = guest grid layouts (2x2, 2x3, 3x3).
     */
    public function getDirectorUrl(): string
    {
        $this->loadMissing('organization');
        $settings = $this->settings ?? [];
        $displayName = $settings['display_name'] ?? null;
        $orgName = $displayName ?: ($this->organization?->name ?? 'Host');
        $label = rawurlencode($orgName);
        $password = $this->getDecryptedPassword();
        $room = rawurlencode($this->getVdoRoomName());
        $pass = rawurlencode((string) $password);

        $layouts = $this->getVdoGridLayouts();
        $layoutsParam = '&slotmode&layouts=' . rawurlencode(json_encode($layouts));

        return "https://vdo.ninja/?director={$room}&password={$pass}&clearstorage&label={$label}&showlabels&activespeaker=1&cleandirector{$layoutsParam}";
    }

    /**
     * Default grid layouts for VDO.Ninja director: 2x2, 2x3, 3x3 guest grids.
     * Each layout is an array of slot objects: x,y,w,h (percent), c (cover), slot (guest index).
     *
     * @return array<int, array<int, array<string, mixed>>>
     */
    protected function getVdoGridLayouts(): array
    {
        return [
            // Layout 0: 2x2 grid (4 guests)
            [
                ['x' => 0, 'y' => 0, 'w' => 50, 'h' => 50, 'c' => true, 'slot' => 0],
                ['x' => 50, 'y' => 0, 'w' => 50, 'h' => 50, 'c' => true, 'slot' => 1],
                ['x' => 0, 'y' => 50, 'w' => 50, 'h' => 50, 'c' => true, 'slot' => 2],
                ['x' => 50, 'y' => 50, 'w' => 50, 'h' => 50, 'c' => true, 'slot' => 3],
            ],
            // Layout 1: 2x3 grid (6 guests)
            [
                ['x' => 0, 'y' => 0, 'w' => 50, 'h' => 33.333, 'c' => true, 'slot' => 0],
                ['x' => 50, 'y' => 0, 'w' => 50, 'h' => 33.333, 'c' => true, 'slot' => 1],
                ['x' => 0, 'y' => 33.333, 'w' => 50, 'h' => 33.333, 'c' => true, 'slot' => 2],
                ['x' => 50, 'y' => 33.333, 'w' => 50, 'h' => 33.333, 'c' => true, 'slot' => 3],
                ['x' => 0, 'y' => 66.667, 'w' => 50, 'h' => 33.333, 'c' => true, 'slot' => 4],
                ['x' => 50, 'y' => 66.667, 'w' => 50, 'h' => 33.333, 'c' => true, 'slot' => 5],
            ],
            // Layout 2: 3x3 grid (9 guests)
            [
                ['x' => 0, 'y' => 0, 'w' => 33.333, 'h' => 33.333, 'c' => true, 'slot' => 0],
                ['x' => 33.333, 'y' => 0, 'w' => 33.333, 'h' => 33.333, 'c' => true, 'slot' => 1],
                ['x' => 66.667, 'y' => 0, 'w' => 33.333, 'h' => 33.333, 'c' => true, 'slot' => 2],
                ['x' => 0, 'y' => 33.333, 'w' => 33.333, 'h' => 33.333, 'c' => true, 'slot' => 3],
                ['x' => 33.333, 'y' => 33.333, 'w' => 33.333, 'h' => 33.333, 'c' => true, 'slot' => 4],
                ['x' => 66.667, 'y' => 33.333, 'w' => 33.333, 'h' => 33.333, 'c' => true, 'slot' => 5],
                ['x' => 0, 'y' => 66.667, 'w' => 33.333, 'h' => 33.333, 'c' => true, 'slot' => 6],
                ['x' => 33.333, 'y' => 66.667, 'w' => 33.333, 'h' => 33.333, 'c' => true, 'slot' => 7],
                ['x' => 66.667, 'y' => 66.667, 'w' => 33.333, 'h' => 33.333, 'c' => true, 'slot' => 8],
            ],
        ];
    }

    /**
     * Get the VDO.Ninja participant/guest URL.
     * Room and password are URL-encoded so special characters don't break the link.
     * &label= (empty) prompts the user for a display name on load; the name is shown in Video Ninja after join.
     */
    public function getParticipantUrl(): string
    {
        $password = $this->getDecryptedPassword();
        $room = rawurlencode($this->getVdoRoomName());
        $pass = rawurlencode((string) $password);
        return "https://vdo.ninja/?room={$room}&password={$pass}&label=&showlabels&activespeaker=1";
    }

    /**
     * Check if the stream is currently live.
     */
    public function isLive(): bool
    {
        return $this->status === 'live' && $this->started_at !== null;
    }

    /**
     * Check if the stream can be started.
     */
    public function canStart(): bool
    {
        return in_array($this->status, ['draft', 'scheduled']);
    }

    /**
     * Check if the stream can be ended.
     */
    public function canEnd(): bool
    {
        return $this->status === 'live';
    }

    /**
     * Scope for active/live streams.
     */
    public function scopeLive($query)
    {
        return $query->where('status', 'live');
    }

    /**
     * Scope for scheduled streams.
     */
    public function scopeScheduled($query)
    {
        return $query->where('status', 'scheduled');
    }

    /**
     * Scope for organization streams.
     */
    public function scopeForOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }
}
