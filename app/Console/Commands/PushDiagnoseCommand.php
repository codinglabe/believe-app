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

        if (! is_file($credentialsPath)) {
            $this->newLine();
            $this->error('Server cannot SEND pushes without storage/app/firebase/firebase-credentials.json');
            $this->line('Download from Firebase Console → Project settings → Service accounts → Generate new private key');
            $this->line('Save as: backend/storage/app/firebase/firebase-credentials.json');

            return self::FAILURE;
        }

        try {
            $firebase = app(FirebaseService::class);
            $reflection = new \ReflectionClass($firebase);
            $method = $reflection->getMethod('getAccessToken');
            $method->setAccessible(true);
            $token = $method->invoke($firebase);
            if ($token) {
                $this->info('Firebase API access token: OK (server can send pushes)');
            } else {
                $this->error('Could not obtain Firebase access token — check credentials JSON and FIREBASE_VERIFY_SSL');
            }
        } catch (\Throwable $e) {
            $this->error('Firebase error: '.$e->getMessage());
        }

        $this->newLine();
        $this->line('Browser (local): use http://127.0.0.1:8000 or http://localhost:8000');
        $this->line('After login, run in DevTools console: enableBelievePush()');
        $this->line('Test toast only: testBelievePushToast()');

        return self::SUCCESS;
    }
}
