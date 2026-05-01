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
        $base = "https://vdo.ninja/?director={$room}{$passwordParam}&clearstorage&label={$label}&showlabels=1&activespeaker=1&cleandirector&openscene{$layoutsParam}";

        if ($recordEnabled && $recordToDropbox && $this->user && ! empty($this->user->dropbox_refresh_token)) {
            $oauthService = app(\App\Services\DropboxOAuthService::class);
            $dropboxToken = $oauthService->getAccessTokenForUser($this->user);
            if (! empty($dropboxToken)) {
                $folderName = $this->getDropboxFolderName();
                $folderPath = '/' . trim($folderName, '/');
                $oauthService->ensureFolderExists($dropboxToken, $folderPath);
                $base .= '&dropbox=' . rawurlencode($dropboxToken);
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

    /**
     * Guest / participant link. &audiodevice=1 and &videodevice=1 = VDO.Ninja auto-picks the system default
     * microphone and camera (not a specific index). Do not use =0 — that disables audio/video.
     */
    public function getParticipantUrl(): string
    {
        $password = $this->getDecryptedPassword();
        $room = rawurlencode($this->getVdoRoomName());
        $pass = rawurlencode((string) $password);
        $passwordParam = $pass !== '' ? '&password=' . $pass : '';
        $avatarInitialUrl = 'https://ui-avatars.com/api/?name=Guest&size=256&length=1';
        return "https://vdo.ninja/?room={$room}{$passwordParam}&label=&audiodevice=1&videodevice=1&norecord&showlabels=1&showall&style=6&avatar=" . rawurlencode($avatarInitialUrl) . '&autostart&noheader';
    }

    public function getRoomViewUrl(): string
    {
        $room = rawurlencode($this->getVdoRoomName());
        $pw = rawurlencode((string) $this->getDecryptedPassword());
        $passwordParam = $pw !== '' ? '&password=' . $pw : '';
        return "https://vdo.ninja/?room={$room}{$passwordParam}&nopush&viewonly&activespeaker=1&showall&showlabels=1&cleanoutput&noheader&nopreview&nocontrols&nosettings&autostart";
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
        return "https://vdo.ninja/?view={$view}&solo&fullscreen&room={$room}{$passwordParam}&cleanoutput&noheader&nopreview&nocontrols&nosettings&autostart";
    }

    public function getPublicViewUrlMuted(): string
    {
        return $this->getSoloViewUrl() . '&noaudio';
    }

    public function getPublicViewUrlFallback(): string
    {
        return $this->getSoloViewUrl();
    }

    public function getHostPushUrl(bool $recordToDropbox = false): string
    {
        $this->loadMissing('user');
        $settings = $this->settings ?? [];
        $displayName = $settings['display_name'] ?? null;
        $recordEnabled = (bool) ($settings['record_meeting'] ?? true);
        $hostName = $displayName ?: ($this->user?->name ?? 'Host');
        $roomName = $this->getVdoRoomName();
        $room = rawurlencode($roomName);
        $push = rawurlencode($roomName);
        $label = rawurlencode($hostName);
        $pass = rawurlencode((string) $this->getDecryptedPassword());
        $passwordParam = $pass !== '' ? '&password=' . $pass : '';
        $initial = mb_substr(trim($hostName), 0, 1) ?: 'H';
        $avatarParam = '&avatar=' . rawurlencode("https://ui-avatars.com/api/?name={$initial}&size=256&length=1");
        $recordParam = $recordEnabled ? '&record' : '';
        $base = "https://vdo.ninja/?room={$room}&push={$push}&label={$label}{$recordParam}&quality=0&bitrate=6000&audiodevice=1&videodevice=1&showlabels=1&showall&style=6{$avatarParam}&autostart&noheader{$passwordParam}";

        if ($recordEnabled && $recordToDropbox && $this->user && ! empty($this->user->dropbox_refresh_token)) {
            $oauthService = app(\App\Services\DropboxOAuthService::class);
            $dropboxToken = $oauthService->getAccessTokenForUser($this->user);
            if (! empty($dropboxToken)) {
                $folderName = $this->getDropboxFolderName();
                $folderPath = '/' . trim($folderName, '/');
                $oauthService->ensureFolderExists($dropboxToken, $folderPath);
                $base .= '&dropbox=' . rawurlencode($dropboxToken);
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
        return in_array($this->status, ['draft', 'scheduled', 'meeting_live']);
    }
}
