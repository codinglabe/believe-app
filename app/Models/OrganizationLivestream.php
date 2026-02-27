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
        'is_public',
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
        'is_public' => 'boolean',
        'settings' => 'array',
    ];

    /**
     * Get the organization that owns this livestream.
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Invite tokens for guest join links (/join/{token}).
     */
    public function inviteTokens(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(LivestreamInviteToken::class, 'organization_livestream_id');
    }

    /** VDO.Ninja room name max length (they allow &lt; 31). */
    private const VDO_ROOM_NAME_MAX_LENGTH = 30;

    /** Meeting slug prefix per client: biu_mtg_xxxx */
    private const MEETING_SLUG_PREFIX = 'biu_mtg_';

    /**
     * Generate a unique meeting/room name (slug) for BIU meetings.
     * Format: biu_mtg_ + 8 random alphanumeric. VDO.Ninja: alphanumeric only, max 31 chars.
     */
    public static function generateRoomName(Organization $organization): string
    {
        $roomName = self::MEETING_SLUG_PREFIX . Str::random(8);
        $roomName = substr($roomName, 0, self::VDO_ROOM_NAME_MAX_LENGTH);
        while (self::where('room_name', $roomName)->exists()) {
            $roomName = self::MEETING_SLUG_PREFIX . Str::random(8);
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
     * &record = enable recording so the director can record the meeting (start/stop from VDO.Ninja UI).
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
        // openscene = allow scene viewers (e.g. Unity Live embed) to receive scene 0. showlabels=1 = names in grid (avatar labels).
        return "https://vdo.ninja/?director={$room}&password={$pass}&clearstorage&label={$label}&showlabels=1&activespeaker=1&cleandirector&record&openscene{$layoutsParam}";
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
     * &label= (empty) prompts for display name. &showall &showlabels=1 &style=6 = grid.
     * &videodevice=0 = no camera from start. &avatar= with initial image so avatar shows immediately (not only after share-and-stop).
     * Participants can enable camera or screen share later; they can see others' video in the grid.
     */
    public function getParticipantUrl(): string
    {
        $password = $this->getDecryptedPassword();
        $room = rawurlencode($this->getVdoRoomName());
        $pass = rawurlencode((string) $password);
        $avatarInitialUrl = 'https://ui-avatars.com/api/?name=Guest&size=256&length=1';
        return "https://vdo.ninja/?room={$room}&password={$pass}&label=&videodevice=0&showlabels=1&showall&style=6&avatar=" . rawurlencode($avatarInitialUrl) . '&autostart&noheader';
    }

    /**
     * OBS scene URL: director=ROOM&output. Not the push link — this is the director output (what Unity Live uses).
     */
    public function getObsOutputUrl(): string
    {
        $room = rawurlencode($this->getVdoRoomName());
        $pw = rawurlencode((string) $this->getDecryptedPassword());
        $passwordParam = $pw !== '' ? '&password=' . $pw : '';
        return "https://vdo.ninja/?director={$room}{$passwordParam}&output&autostart&cleanoutput&noheader&nocontrols&nosettings";
    }

    /**
     * Public viewer URL for /live/{slug}: view-only room so viewers see the same as the host.
     * Shows: host screen/share, host webcam, and every participant's screen share or webcam.
     * Uses room view (getRoomViewUrl), not solo — so all pushers in the room are visible.
     */
    public function getPublicViewUrl(): ?string
    {
        return $this->getRoomViewUrl();
    }

    /**
     * Room view URL: view-only (no camera/screen prompt). Same content the host sees.
     * - nopush / viewonly: receive only, no publishing (viewers never prompted to share).
     * - showall: show every participant (host + guests) who is pushing screen or webcam.
     * - activespeaker=1: emphasize active speaker; showlabels=1 for names.
     * So: host's feed, any participant's share, and whatever the host is watching is what goes live.
     */
    public function getRoomViewUrl(): string
    {
        $room = rawurlencode($this->getVdoRoomName());
        $pw = rawurlencode((string) $this->getDecryptedPassword());
        $passwordParam = $pw !== '' ? '&password=' . $pw : '';
        return "https://vdo.ninja/?room={$room}{$passwordParam}&nopush&viewonly&activespeaker=1&showall&showlabels=1&cleanoutput&noheader&nopreview&nocontrols&nosettings&autostart";
    }

    /**
     * Solo view URL: one stream full screen (view=roomName&solo). Only shows host stream (ID = room name).
     * Use as fallback or when you only need the host feed.
     * &autostart = start receiving/displaying the stream as soon as the viewer page loads (helps on reload).
     */
    public function getSoloViewUrl(): string
    {
        $roomName = $this->getVdoRoomName();
        $view = rawurlencode($roomName);
        $room = rawurlencode($roomName);
        $pw = rawurlencode((string) $this->getDecryptedPassword());
        $passwordParam = $pw !== '' ? '&password=' . $pw : '';
        return "https://vdo.ninja/?view={$view}&solo&fullscreen&room={$room}{$passwordParam}&cleanoutput&noheader&nopreview&nocontrols&nosettings&autostart";
    }

    /**
     * Fallback viewer URL: solo view (host stream only) if director output is not in use.
     */
    public function getPublicViewUrlFallback(): string
    {
        return $this->getSoloViewUrl();
    }

    /**
     * Public view URL with no audio (for Unity Live index previews).
     * Use on listing page so multiple stream previews don't all play sound; sound only on watch page.
     */
    public function getPublicViewUrlMuted(): string
    {
        return $this->getSoloViewUrl() . '&noaudio';
    }

    /**
     * Get the VDO.Ninja host push link (no OBS): host joins and pushes their stream.
     * Uses push={roomName} so stream ID matches getPublicViewUrl (view=roomName). label= sets display name.
     * &record = host can record. &showlabels=1 &showall = grid; &style=6 = avatar (initial) until video.
     * &videodevice=0 = no camera from start so avatar/initial shows immediately (not only after share-and-stop).
     * Custom host avatar: set livestream settings['host_avatar_url'] to a full image URL; otherwise no avatar param.
     * Do not use &novideo for host — it blocks receiving video (participant screen shares would not show).
     */
    public function getHostPushUrl(): string
    {
        $this->loadMissing('organization');
        $settings = $this->settings ?? [];
        $displayName = $settings['display_name'] ?? null;
        $hostName = $displayName ?: ($this->organization?->name ?? 'Host');
        $roomName = $this->getVdoRoomName();
        $room = rawurlencode($roomName);
        $push = rawurlencode($roomName);
        $label = rawurlencode($hostName);
        $pass = rawurlencode((string) $this->getDecryptedPassword());
        $passwordParam = $pass !== '' ? '&password=' . $pass : '';
        $avatarParam = '';
        $avatarUrl = $settings['host_avatar_url'] ?? null;
        if (!empty($avatarUrl) && filter_var($avatarUrl, FILTER_VALIDATE_URL)) {
            $avatarParam = '&avatar=' . rawurlencode($avatarUrl);
        } else {
            $initial = mb_substr(trim($hostName), 0, 1) ?: 'H';
            $avatarParam = '&avatar=' . rawurlencode("https://ui-avatars.com/api/?name={$initial}&size=256&length=1");
        }
        return "https://vdo.ninja/?room={$room}&push={$push}&label={$label}&record&videodevice=0&showlabels=1&showall&style=6{$avatarParam}&autostart&noheader{$passwordParam}";
    }

    /**
     * Check if the stream is currently live.
     */
    public function isLive(): bool
    {
        return $this->status === 'live' && $this->started_at !== null;
    }

    /**
     * Check if the stream can be started (meeting in progress, not yet streaming).
     */
    public function canStartMeeting(): bool
    {
        return in_array($this->status, ['draft', 'scheduled']);
    }

    /**
     * Check if the stream can be started (legacy).
     */
    public function canStart(): bool
    {
        return in_array($this->status, ['draft', 'scheduled']);
    }

    /**
     * Check if host can trigger "Go Live" (stream to viewers).
     */
    public function canGoLive(): bool
    {
        return in_array($this->status, ['draft', 'scheduled', 'meeting_live']);
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
