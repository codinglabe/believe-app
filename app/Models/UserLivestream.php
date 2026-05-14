<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

/**
 * Supporter (user) livestream — same VDO.Ninja flow as organization livestreams.
 */
class UserLivestream extends Model
{
    use HasFactory;

    protected $table = 'user_livestreams';

    protected $fillable = [
        'user_id',
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

    private const VDO_ROOM_NAME_MAX_LENGTH = 30;
    private const ROOM_PREFIX = 'sup_';
    private const DROPBOX_FOLDER_MAX_LENGTH = 80;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function generateRoomName(): string
    {
        $roomName = self::ROOM_PREFIX . Str::random(8);
        $roomName = substr($roomName, 0, self::VDO_ROOM_NAME_MAX_LENGTH);
        while (self::where('room_name', $roomName)->exists()) {
            $roomName = self::ROOM_PREFIX . Str::random(8);
            $roomName = substr($roomName, 0, self::VDO_ROOM_NAME_MAX_LENGTH);
        }
        return $roomName;
    }

    public static function generatePassword(): string
    {
        return Str::random(8);
    }

    public function getDecryptedPassword(): string
    {
        try {
            return Crypt::decryptString($this->room_password);
        } catch (\Exception $e) {
            return $this->room_password;
        }
    }

    public function getDecryptedStreamKey(): ?string
    {
        if (! $this->youtube_stream_key) {
            return null;
        }
        try {
            return Crypt::decryptString($this->youtube_stream_key);
        } catch (\Exception $e) {
            return $this->youtube_stream_key;
        }
    }

    public function getVdoRoomName(): string
    {
        $safe = preg_replace('/[^a-zA-Z0-9_]/', '_', $this->room_name);
        $safe = trim($safe, '_') ?: 'room';
        return substr($safe, 0, self::VDO_ROOM_NAME_MAX_LENGTH);
    }

    protected function getVdoGridLayouts(): array
    {
        return [
            [
                ['x' => 0, 'y' => 0, 'w' => 50, 'h' => 50, 'c' => true, 'slot' => 0],
                ['x' => 50, 'y' => 0, 'w' => 50, 'h' => 50, 'c' => true, 'slot' => 1],
                ['x' => 0, 'y' => 50, 'w' => 50, 'h' => 50, 'c' => true, 'slot' => 2],
                ['x' => 50, 'y' => 50, 'w' => 50, 'h' => 50, 'c' => true, 'slot' => 3],
            ],
            [
                ['x' => 0, 'y' => 0, 'w' => 50, 'h' => 33.333, 'c' => true, 'slot' => 0],
                ['x' => 50, 'y' => 0, 'w' => 50, 'h' => 33.333, 'c' => true, 'slot' => 1],
                ['x' => 0, 'y' => 33.333, 'w' => 50, 'h' => 33.333, 'c' => true, 'slot' => 2],
                ['x' => 50, 'y' => 33.333, 'w' => 50, 'h' => 33.333, 'c' => true, 'slot' => 3],
                ['x' => 0, 'y' => 66.667, 'w' => 50, 'h' => 33.333, 'c' => true, 'slot' => 4],
                ['x' => 50, 'y' => 66.667, 'w' => 50, 'h' => 33.333, 'c' => true, 'slot' => 5],
            ],
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

    public function getDirectorUrl(bool $recordToDropbox = false): string
    {
        $this->loadMissing('user');
        $settings = $this->settings ?? [];
        $displayName = $settings['display_name'] ?? null;
        $recordEnabled = (bool) ($settings['record_meeting'] ?? true);
        $hostName = $displayName ?: ($this->user?->name ?? 'Host');
        $label = rawurlencode($hostName);
        $password = $this->getDecryptedPassword();
        $room = rawurlencode($this->getVdoRoomName());
        $pass = rawurlencode((string) $password);
        $passwordParam = $pass !== '' ? '&password=' . $pass : '';
        $layouts = $this->getVdoGridLayouts();
        $layoutsParam = '&slotmode&layouts=' . rawurlencode(json_encode($layouts));
        $base = "https://vdo.ninja/?director={$room}{$passwordParam}&clearstorage&label={$label}&showlabels=zoom&fontsize=82&activespeaker=1&cleandirector&openscene{$layoutsParam}";

        if ($recordEnabled && $recordToDropbox) {
            $ctx = $this->resolveDropboxUploadContext();
            if ($ctx !== null) {
                $oauthService = app(\App\Services\DropboxOAuthService::class);
                $folderName = $ctx['folderName'];
                $folderPath = '/' . trim($folderName, '/');
                $oauthService->ensureFolderExists($ctx['token'], $folderPath);
                $base .= '&dropbox=' . rawurlencode($ctx['token']);
                $base .= '&dropboxpath=/' . rawurlencode($folderName);
                $base .= '&cloud=1';
            }
        }

        return $base;
    }

    private static function sanitizeDropboxFolderName(string $raw): string
    {
        $safe = preg_replace('/[\\\\\/:*?"<>|]+/', ' ', $raw);
        $safe = preg_replace('/\s+/', ' ', trim($safe));
        return trim($safe, " \t\n\r\0\x0B.");
    }

    public function getDropboxFolderName(): string
    {
        $userFolder = $this->user?->dropbox_folder_name;
        if ($userFolder !== null && $userFolder !== '') {
            $safe = self::sanitizeDropboxFolderName($userFolder);
            if ($safe !== '') {
                return substr($safe, 0, self::DROPBOX_FOLDER_MAX_LENGTH);
            }
        }
        return 'BIU Meeting Recordings';
    }

    /** Folder segment when recording via the supporter's organization's linked Dropbox (Integrations pattern). */
    public function getOrganizationDropboxFolderName(): string
    {
        $this->user?->loadMissing('organization');
        $orgFolder = $this->user?->organization?->dropbox_folder_name;
        if ($orgFolder !== null && $orgFolder !== '') {
            $safe = self::sanitizeDropboxFolderName($orgFolder);
            if ($safe !== '') {
                return substr($safe, 0, self::DROPBOX_FOLDER_MAX_LENGTH);
            }
        }

        return 'BIU Meeting Recordings';
    }

    /**
     * Resolves Dropbox access for VDO.Ninja uploads: user's own token first, else organization's (same as Unity Meet recordings).
     *
     * @return array{token: string, folderName: string}|null
     */
    protected function resolveDropboxUploadContext(): ?array
    {
        $this->loadMissing('user');
        if (! $this->user) {
            return null;
        }

        $oauthService = app(\App\Services\DropboxOAuthService::class);

        if (! empty($this->user->dropbox_refresh_token)) {
            $dropboxToken = $oauthService->getAccessTokenForUser($this->user);

            return ! empty($dropboxToken)
                ? ['token' => $dropboxToken, 'folderName' => $this->getDropboxFolderName()]
                : null;
        }

        $this->user->loadMissing('organization');
        $organization = $this->user->organization;
        if ($organization && ! empty($organization->dropbox_refresh_token)) {
            $dropboxToken = $oauthService->getAccessTokenForOrganization($organization);

            return ! empty($dropboxToken)
                ? ['token' => $dropboxToken, 'folderName' => $this->getOrganizationDropboxFolderName()]
                : null;
        }

        return null;
    }

    /**
     * Guest / participant link. Same publisher path as host: &webcam + &ssb + &vdo=1 + &audiodevice=1 + &proaudio + &stereo=2
     * (no &intro — intro delays auto camera and shows an extra menu before permissions; host push does not use it).
     * Do not combine &showall with &style=6 — style overrides and breaks the group grid.
     * &showlabels=zoom &rows=1 &fontsize=82: names on tiles + one row (e.g. two people side-by-side).
     * &vdo=1 pre-selects the default camera; &audiodevice=1 the default mic; &autostart keeps room subscriptions stable.
     * &nocontrols hides the per-tile video control bar (play/progress); not the user mic/settings bar. &clock=false disables wall-clock overlay.
     */
    public function getParticipantUrl(): string
    {
        $password = $this->getDecryptedPassword();
        $room = rawurlencode($this->getVdoRoomName());
        $pass = rawurlencode((string) $password);
        $passwordParam = $pass !== '' ? '&password=' . $pass : '';
        $avatarInitialUrl = 'https://ui-avatars.com/api/?name=' . rawurlencode('Guest') . '&size=256&length=2';
        return "https://vdo.ninja/?room={$room}{$passwordParam}&label=&webcam&ssb&vdo=1&audiodevice=1&proaudio&stereo=2&norecord&showlabels=zoom&showall&rows=1&fontsize=82&nocontrols&clock=false&avatar=" . rawurlencode($avatarInitialUrl) . '&autostart&noheader';
    }

    public function getRoomViewUrl(): string
    {
        $room = rawurlencode($this->getVdoRoomName());
        $pw = rawurlencode((string) $this->getDecryptedPassword());
        $passwordParam = $pw !== '' ? '&password=' . $pw : '';
        return "https://vdo.ninja/?room={$room}{$passwordParam}&nopush&viewonly&activespeaker=1&showall&showlabels=zoom&rows=1&fontsize=82&cleanoutput&noheader&nopreview&nocontrols&nosettings&clock=false&autostart";
    }

    public function getPublicViewUrl(): ?string
    {
        return $this->getRoomViewUrl();
    }

    public function getSoloViewUrl(): string
    {
        $roomName = $this->getVdoRoomName();
        $view = rawurlencode($roomName);
        $room = rawurlencode($roomName);
        $pw = rawurlencode((string) $this->getDecryptedPassword());
        $passwordParam = $pw !== '' ? '&password=' . $pw : '';
        return "https://vdo.ninja/?view={$view}&solo&fullscreen&room={$room}{$passwordParam}&showlabels=zoom&fontsize=82&cleanoutput&noheader&nopreview&nocontrols&nosettings&autostart";
    }

    public function getPublicViewUrlMuted(): string
    {
        return $this->getSoloViewUrl() . '&noaudio';
    }

    public function getPublicViewUrlFallback(): string
    {
        return $this->getSoloViewUrl();
    }

    /**
     * Host push link (room + WHIP to MediaMTX when configured).
     * &webcam + &ssb: skip the camera vs screenshare fork for publishers; &ssb keeps screenshare in the bar.
     * Do not add &style=6 with &showall — style overrides and breaks the multi-participant grid (VDO treats showall as style 7).
     * &vdo=1 + &audiodevice=1: default camera/mic pre-selected; &autostart keeps room/grid subscriptions stable after load.
     *
     * `room` must match {@see getParticipantUrl()} / {@see getVdoRoomName()} so host and guests join the same VDO room
     * (multi-participant grid). `push` stays the stable stream id ({@see StreamingWorkerSourceUrl::streamPath()}) for WHIP/MediaMTX.
     * &nocontrols hides per-tile play/progress controls; &clock=false disables wall-clock overlay.
     */
    public function getHostPushUrl(bool $recordToDropbox = false): string
    {
        $this->loadMissing('user');
        $settings = $this->settings ?? [];
        $displayName = $settings['display_name'] ?? null;
        $recordEnabled = (bool) ($settings['record_meeting'] ?? true);
        $hostName = $displayName ?: ($this->user?->name ?? 'Host');
        $streamKey = \App\Support\StreamingWorkerSourceUrl::streamPath($this);
        $room = rawurlencode($this->getVdoRoomName());
        $push = rawurlencode($streamKey);
        $label = rawurlencode($hostName);
        $pass = rawurlencode((string) $this->getDecryptedPassword());
        $passwordParam = $pass !== '' ? '&password=' . $pass : '';
        $hn = trim($hostName) !== '' ? trim($hostName) : 'Host';
        $avatarImage = 'https://ui-avatars.com/api/?name=' . rawurlencode($hn) . '&size=256&length=2';
        $avatarParam = '&avatar=' . rawurlencode($avatarImage);
        $recordParam = $recordEnabled ? '&record' : '';
        $base = "https://vdo.ninja/?room={$room}&push={$push}&label={$label}{$recordParam}&quality=0&bitrate=6000&webcam&ssb&vdo=1&audiodevice=1&proaudio&stereo=2&showlabels=zoom&showall&rows=1&fontsize=82&nocontrols&clock=false{$avatarParam}&autostart&noheader{$passwordParam}";

        $mediaMtxHost = \App\Support\StreamingWorkerSourceUrl::bridgeMediaMtxHost();
        if ($mediaMtxHost !== null) {
            // VDO publishes to /{room}/{push}/whip through MediaMTX; force H.264 for RTMP remuxing.
            $base .= '&mediamtx=' . $mediaMtxHost . '&codec=h264';
        }

        if ($recordEnabled && $recordToDropbox) {
            $ctx = $this->resolveDropboxUploadContext();
            if ($ctx !== null) {
                $oauthService = app(\App\Services\DropboxOAuthService::class);
                $folderName = $ctx['folderName'];
                $folderPath = '/' . trim($folderName, '/');
                $oauthService->ensureFolderExists($ctx['token'], $folderPath);
                $base .= '&dropbox=' . rawurlencode($ctx['token']);
                $base .= '&dropboxpath=/' . rawurlencode($folderName);
                $base .= '&autorecordlocal=6000';
                $base .= '&cloud=1';
            }
        }

        return $base;
    }

    public function canStartMeeting(): bool
    {
        return in_array($this->status, ['draft', 'scheduled']);
    }

    public function canGoLive(): bool
    {
        return in_array($this->status, ['draft', 'scheduled', 'meeting_live', 'ended'], true);
    }
}
