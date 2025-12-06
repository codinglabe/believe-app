<?php

namespace App\Http\Controllers\Facebook;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Http;

class ConfigurationController extends Controller
{
    public function index()
    {
        $config = [
            'app_id' => config('services.facebook.app_id'),
            'redirect_uri' => config('services.facebook.redirect_uri'),
            'app_url' => config('app.url'),
            'environment' => app()->environment(),
        ];

        // Test Facebook API connection
        $apiTest = $this->testFacebookApi();

        // Test Valet/HTTPS
        $httpsTest = $this->testHttps();

        // Test Database
        $dbTest = $this->testDatabase();

        return Inertia::render('Facebook/Configuration', [
            'config' => $config,
            'tests' => [
                'facebook_api' => $apiTest,
                'https' => $httpsTest,
                'database' => $dbTest,
                'all_passed' => $apiTest['success'] && $httpsTest['success'] && $dbTest['success'],
            ],
            'next_steps' => $this->getNextSteps($apiTest, $httpsTest, $dbTest),
        ]);
    }

    private function testFacebookApi()
    {
        $appId = config('services.facebook.app_id');
        $appSecret = config('services.facebook.app_secret');

        if (!$appId || !$appSecret) {
            return [
                'success' => false,
                'message' => 'Facebook App ID or Secret not configured',
                'details' => [
                    'app_id_set' => !empty($appId),
                    'app_secret_set' => !empty($appSecret),
                ],
            ];
        }

        try {
            // Test app access token
            $response = Http::get('https://graph.facebook.com/debug_token', [
                'input_token' => $appId . '|' . $appSecret,
                'access_token' => $appId . '|' . $appSecret,
            ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message' => 'Facebook API connection successful',
                    'details' => $response->json(),
                ];
            }

            return [
                'success' => false,
                'message' => 'Facebook API test failed',
                'details' => $response->json(),
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Facebook API test error: ' . $e->getMessage(),
                'details' => [],
            ];
        }
    }

    private function testHttps()
    {
        $url = config('app.url');

        if (strpos($url, 'https://') === 0) {
            return [
                'success' => true,
                'message' => 'HTTPS is enabled',
                'details' => ['url' => $url],
            ];
        }

        return [
            'success' => false,
            'message' => 'HTTPS is not enabled. Facebook requires HTTPS.',
            'details' => [
                'current_url' => $url,
                'required' => 'Must start with https://',
            ],
        ];
    }

    private function testDatabase()
    {
        try {
            $accounts = \App\Models\FacebookAccount::count();
            return [
                'success' => true,
                'message' => 'Database connection successful',
                'details' => ['total_accounts' => $accounts],
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage(),
                'details' => [],
            ];
        }
    }

    private function getNextSteps($apiTest, $httpsTest, $dbTest)
    {
        $steps = [];

        if (!$httpsTest['success']) {
            $steps[] = [
                'title' => 'Enable HTTPS',
                'description' => 'Run: valet secure bapp',
                'command' => 'valet secure bapp',
                'priority' => 'high',
            ];
        }

        if (!$apiTest['success']) {
            $steps[] = [
                'title' => 'Configure Facebook App',
                'description' => 'Check .env file and Facebook Developer settings',
                'url' => 'https://developers.facebook.com/apps/1662530284160452/settings/',
                'priority' => 'high',
            ];
        }

        return $steps;
    }
}
