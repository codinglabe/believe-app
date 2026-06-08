<?php

namespace App\Console\Commands;

use App\Services\FirebaseService;
use Illuminate\Console\Command;

class PushDiagnoseCommand extends Command
{
    protected $signature = 'push:diagnose';

    protected $description = 'Check local FCM / push notification configuration';

    public function handle(): int
    {
        $projectId = config('services.firebase.project_id');
        $credentials = config('services.firebase.credentials');
        $credentialsPath = storage_path($credentials);
        $vapid = config('services.firebase.vapid_key');

        $this->info('Firebase push configuration');
        $this->line('  Project ID: '.($projectId ?: '(missing)'));
        $this->line('  Credentials path: '.$credentialsPath);
        $this->line('  Credentials exist: '.(is_file($credentialsPath) ? 'yes' : 'NO — add firebase-credentials.json'));
        $this->line('  VAPID key set: '.($vapid ? 'yes' : 'NO'));
        $pushQueue = config('services.firebase.queue_connection', 'sync');
        $this->line('  Push job queue: '.$pushQueue.($pushQueue === 'sync' ? ' (immediate — no worker required)' : ' (requires queue:work)'));

        $cafile = config('services.firebase.cafile');
        $caResolved = storage_path('app/cacert.pem');
        if (is_string($cafile) && $cafile !== '' && is_file($cafile)) {
            $caResolved = $cafile;
        } elseif (is_file(storage_path('app/cacert.pem'))) {
            $caResolved = storage_path('app/cacert.pem');
        } elseif (is_string($cafile) && $cafile !== '' && is_file(base_path($cafile))) {
            $caResolved = base_path($cafile);
        }
        $this->line('  TLS CA file: '.(is_file($caResolved) ? $caResolved : '(not found — Windows may need storage/app/cacert.pem)'));

        if (! is_file($credentialsPath)) {
            $this->newLine();
            $this->error('Server cannot SEND pushes without storage/app/firebase/firebase-credentials.json');
            $this->line('Download from Firebase Console → Project settings → Service accounts → Generate new private key');
            $this->line('Save as: backend/storage/app/firebase/firebase-credentials.json');

            return self::FAILURE;
        }

        $serviceAccountEmail = null;
        try {
            $creds = json_decode((string) file_get_contents($credentialsPath), true, 512, JSON_THROW_ON_ERROR);
            $serviceAccountEmail = $creds['client_email'] ?? null;
            if ($serviceAccountEmail) {
                $this->line('  Service account: '.$serviceAccountEmail);
            }
            if (($creds['project_id'] ?? null) && ($creds['project_id'] !== $projectId)) {
                $this->warn('  Credentials project_id ('.$creds['project_id'].') differs from FIREBASE_PROJECT_ID ('.$projectId.')');
            }
        } catch (\Throwable $e) {
            $this->error('  Credentials JSON invalid: '.$e->getMessage());
        }

        $fcmPermissionOk = false;

        try {
            $firebase = app(FirebaseService::class);
            $reflection = new \ReflectionClass($firebase);
            $method = $reflection->getMethod('getAccessToken');
            $method->setAccessible(true);
            $token = $method->invoke($firebase);
            if ($token) {
                $this->info('Firebase OAuth access token: OK');
            } else {
                $this->error('Could not obtain Firebase access token — check credentials JSON and FIREBASE_VERIFY_SSL');

                return self::FAILURE;
            }

            // Probe FCM IAM: 403 = missing permission; 404 UNREGISTERED = permission OK.
            $probe = $firebase->sendToDevice('permission-probe-invalid-token', 'Probe', 'Probe', [], 'web');
            $errorCode = (string) ($probe['error_code'] ?? '');

            if ($probe['success']) {
                $fcmPermissionOk = true;
                $this->info('FCM send permission: OK');
            } elseif (str_contains($errorCode, 'UNREGISTERED') || str_contains($errorCode, 'INVALID_ARGUMENT')) {
                $fcmPermissionOk = true;
                $this->info('FCM send permission: OK (API accepted request; token rejected as expected)');
            } elseif (str_contains($errorCode, 'cloudmessaging.messages.create') || str_contains($errorCode, 'PERMISSION_DENIED')) {
                $this->error('FCM send permission: DENIED (403 IAM)');
                $this->newLine();
                $this->warn('Fix in Google Cloud Console:');
                $this->line('  1. Open https://console.cloud.google.com/iam-admin/iam?project='.($projectId ?: 'believe-in-unity-d8adc'));
                $this->line('  2. Find: '.($serviceAccountEmail ?: 'firebase-adminsdk-…@….iam.gserviceaccount.com'));
                $this->line('  3. Edit → Add role → "Firebase Cloud Messaging Admin"');
                $this->line('  4. Enable API: https://console.cloud.google.com/apis/library/fcm.googleapis.com?project='.($projectId ?: 'believe-in-unity-d8adc'));
                $this->line('  5. Wait 1–2 minutes, then run: php artisan push:diagnose');
            } else {
                $this->warn('FCM probe returned: '.$errorCode);
            }
        } catch (\Throwable $e) {
            $this->error('Firebase error: '.$e->getMessage());

            return self::FAILURE;
        }

        $this->newLine();
        $this->line('Browser (local): use http://127.0.0.1:8000 or http://localhost:8000');
        $this->line('After login, run in DevTools console: enableBelievePush()');
        $this->line('Test toast only: testBelievePushToast()');

        return $fcmPermissionOk ? self::SUCCESS : self::FAILURE;
    }
}
