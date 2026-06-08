<?php

namespace App\Http\Controllers\Internal;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Allows GitHub Actions runners to open SSH through CSF before deploy rsync.
 * Requires DEPLOY_RUNNER_ALLOW_TOKEN in .env and passwordless sudo for allow-runner-ip.sh on the server.
 */
class DeployRunnerAllowController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $expected = (string) config('deploy.runner_allow_token', '');
        if ($expected === '') {
            return response()->json(['ok' => false, 'error' => 'not_configured'], Response::HTTP_NOT_FOUND);
        }

        $provided = $request->bearerToken() ?? '';
        if (! hash_equals($expected, $provided)) {
            return response()->json(['ok' => false, 'error' => 'unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $validated = $request->validate([
            'ip' => ['required', 'ipv4'],
        ]);

        $ip = $validated['ip'];
        $installed = '/usr/local/bin/allow-runner-ip.sh';
        $script = is_file($installed) ? $installed : base_path('scripts/allow-runner-ip.sh');
        if (! is_file($script)) {
            return response()->json(['ok' => false, 'error' => 'script_missing'], Response::HTTP_NOT_FOUND);
        }

        $commands = [
            'sudo -n '.escapeshellarg($script).' '.escapeshellarg($ip).' 2>&1',
            'bash '.escapeshellarg($script).' '.escapeshellarg($ip).' 2>&1',
        ];

        $joined = '';
        $exitCode = 1;
        foreach ($commands as $cmd) {
            $output = [];
            $exitCode = 0;
            exec($cmd, $output, $exitCode);
            $joined = trim(implode("\n", $output));
            if ($exitCode === 0) {
                break;
            }
        }
        Log::info('deploy.runner_allow', ['ip' => $ip, 'exit' => $exitCode, 'output' => $joined]);

        if ($exitCode !== 0) {
            return response()->json([
                'ok' => false,
                'error' => 'allow_failed',
                'detail' => $joined !== '' ? $joined : 'allow-runner-ip.sh failed',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return response()->json([
            'ok' => true,
            'ip' => $ip,
            'detail' => $joined !== '' ? $joined : 'allowed',
        ]);
    }
}
