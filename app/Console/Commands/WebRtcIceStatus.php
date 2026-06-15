<?php

namespace App\Console\Commands;

use App\Services\WebRtcIceService;
use Illuminate\Console\Command;

class WebRtcIceStatus extends Command
{
    protected $signature = 'webrtc:ice-status {--refresh : Clear cache and reload TURN credentials}';

    protected $description = 'Show WebRTC STUN/TURN ICE server configuration status';

    public function handle(WebRtcIceService $ice): int
    {
        if ($this->option('refresh')) {
            $ice->clearCache();
            $this->info('Cleared WebRTC ICE cache.');
        }

        $diagnostics = $ice->diagnostics();

        $this->table(
            ['Setting', 'Value'],
            [
                ['TURN API key configured', $diagnostics['has_turn_api_key'] ? 'yes' : 'no'],
                ['TURN env credentials configured', $diagnostics['has_turn_env'] ? 'yes' : 'no'],
                ['ICE server entries', (string) $diagnostics['server_count']],
                ['TURN entries', (string) $diagnostics['turn_count']],
                ['Active TURN source', $diagnostics['source']],
            ],
        );

        if ($diagnostics['source'] === 'none') {
            $this->warn('No TURN servers configured — set WEBRTC_TURN_URL + credentials for self-hosted coturn.');
        } elseif ($diagnostics['source'] === 'static_fallback') {
            $this->warn('Using deprecated third-party Open Relay fallback.');
        } elseif ($diagnostics['source'] === 'self_hosted') {
            $this->info('Using self-hosted TURN (coturn on VPS).');
        }

        if ($diagnostics['turn_count'] === 0) {
            $this->error('No TURN servers available — WebRTC audio will only work on same LAN.');

            return self::FAILURE;
        }

        $this->info('ICE configuration looks usable.');

        return self::SUCCESS;
    }
}
