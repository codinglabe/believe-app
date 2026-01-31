<?php

namespace App\Http\Controllers\Facebook;

use App\Http\Controllers\Controller;
use App\Models\FacebookAccount;
use App\Models\Organization;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller
{
    protected $appId;
    protected $appSecret;
    protected $redirectUri;

    public function __construct()
    {
        // একটি App ID দিয়ে সব users কাজ করবে
        $this->appId = config('services.facebook.app_id');
        $this->appSecret = config('services.facebook.app_secret');
        $this->redirectUri = config('services.facebook.redirect_uri');
        $this->middleware('auth');
    }

    /**
     * Show Facebook connection page (একদম সহজ version)
     */
    public function connect(Request $request)
    {
        $user = $request->user();
        $organization = $user->organization;

        if (!$organization) {
            return redirect()->route('dashboard')
                ->with('error', 'You need to have an organization to connect Facebook');
        }

        // Get user's connected pages
        $accounts = FacebookAccount::where('user_id', $user->id)
            ->where('organization_id', $organization->id)
            ->latest()
            ->get()
            ->map(function ($account) {
                return [
                    'id' => $account->id,
                    'facebook_page_id' => $account->facebook_page_id,
                    'facebook_page_name' => $account->facebook_page_name,
                    'page_category' => $account->page_category,
                    'followers_count' => $account->followers_count,
                    'is_connected' => $account->is_connected,
                    'last_synced_at' => $account->last_synced_at?->format('Y-m-d H:i:s'),
                    'picture_url' => $account->getPagePictureUrl('small'),
                    'is_token_expired' => $account->isTokenExpired(),
                ];
            });

        return Inertia::render('Facebook/Connect', [
            'accounts' => $accounts,
            'hasConnectedAccounts' => $accounts->count() > 0,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
        ]);
    }

    /**
     * Redirect to Facebook OAuth (একটি App ID দিয়ে)
     */
    public function redirectToFacebook()
    {
        $state = base64_encode(json_encode([
            'user_id' => auth()->id(),
            'time' => time()
        ]));

        $params = [
            'client_id' => $this->appId,
            'redirect_uri' => $this->redirectUri,
            'state' => $state,
            'scope' => 'pages_show_list,pages_read_engagement,pages_manage_posts',
            'response_type' => 'code',
            'auth_type' => 'rerequest',
        ];

        $url = 'https://www.facebook.com/v19.0/dialog/oauth?' . http_build_query($params);

        return redirect($url);
    }

    /**
     * Handle Facebook callback (একটি App ID দিয়ে)
     */
    public function callback(Request $request)
    {
        $request->validate([
            'code' => 'required|string',
            'state' => 'required|string',
        ]);

        $user = $request->user();
        $organization = $user->organization;

        if (!$organization) {
            return redirect()->route('facebook.connect')
                ->with('error', 'Organization not found');
        }

        DB::beginTransaction();

        try {
            // Step 1: Get user access token using OUR app credentials
            $tokenResponse = Http::get('https://graph.facebook.com/v19.0/oauth/access_token', [
                'client_id' => $this->appId,
                'client_secret' => $this->appSecret,
                'redirect_uri' => $this->redirectUri,
                'code' => $request->code,
            ]);

            if (!$tokenResponse->successful()) {
                Log::error('Facebook token error: ' . $tokenResponse->body());
                throw new \Exception('Failed to get access token from Facebook');
            }

            $tokenData = $tokenResponse->json();
            $userAccessToken = $tokenData['access_token'];

            // Step 2: Get Facebook user info
            $userInfo = Http::get('https://graph.facebook.com/v19.0/me', [
                'access_token' => $userAccessToken,
                'fields' => 'id,name',
            ]);

            if (!$userInfo->successful()) {
                throw new \Exception('Failed to get user info from Facebook');
            }

            $facebookUser = $userInfo->json();

            // Step 3: Get long-lived token (60 days)
            $longLivedResponse = Http::get('https://graph.facebook.com/v19.0/oauth/access_token', [
                'grant_type' => 'fb_exchange_token',
                'client_id' => $this->appId,
                'client_secret' => $this->appSecret,
                'fb_exchange_token' => $userAccessToken,
            ]);

            if (!$longLivedResponse->successful()) {
                Log::warning('Could not get long-lived token, using short-lived');
                $longLivedToken = $userAccessToken;
                $expiresIn = 3600; // 1 hour
            } else {
                $longLivedData = $longLivedResponse->json();
                $longLivedToken = $longLivedData['access_token'];
                $expiresIn = $longLivedData['expires_in'] ?? 5184000; // 60 days default
            }

            // Step 4: Get user's pages
            $pagesResponse = Http::get('https://graph.facebook.com/v19.0/me/accounts', [
                'access_token' => $longLivedToken,
                'fields' => 'id,name,category,followers_count,access_token,picture{url}',
                'limit' => 200,
            ]);

            if (!$pagesResponse->successful()) {
                throw new \Exception('Failed to get pages from Facebook');
            }

            $pages = $pagesResponse->json('data', []);

            if (empty($pages)) {
                throw new \Exception('No Facebook pages found for this account. Please make sure you have admin access to at least one page.');
            }

            // Step 5: Save each page
            foreach ($pages as $page) {
                FacebookAccount::updateOrCreate(
                    [
                        'user_id' => $user->id,
                        'organization_id' => $organization->id,
                        'facebook_page_id' => $page['id'],
                    ],
                    [
                        'facebook_user_id' => $facebookUser['id'],
                        'facebook_user_name' => $facebookUser['name'],
                        'facebook_page_name' => $page['name'],
                        'page_access_token' => $page['access_token'],
                        'page_category' => $page['category'] ?? null,
                        'followers_count' => $page['followers_count'] ?? 0,
                        'page_data' => $page,
                        'is_connected' => true,
                        'last_synced_at' => now(),
                        'token_expires_at' => now()->addSeconds($expiresIn),
                    ]
                );
            }

            DB::commit();

            return redirect()->route('facebook.connect')
                ->with('success', 'Successfully connected ' . count($pages) . ' Facebook page(s)!');

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Facebook OAuth error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return redirect()->route('facebook.connect')
                ->with('error', 'Failed to connect Facebook: ' . $e->getMessage());
        }
    }

    /**
     * Disconnect Facebook page
     */
    public function disconnect(Request $request, $id)
    {
        $user = $request->user();

        $account = FacebookAccount::where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        try {
            // Try to revoke permissions from Facebook
            Http::delete("https://graph.facebook.com/v19.0/{$account->facebook_page_id}/permissions", [
                'access_token' => $account->page_access_token,
            ]);
        } catch (\Exception $e) {
            Log::warning('Failed to revoke Facebook token: ' . $e->getMessage());
        }

        $account->delete();

        return redirect()->route('facebook.connect')
            ->with('success', 'Facebook page disconnected successfully');
    }

    /**
     * Refresh Facebook page connection
     */
    public function refresh(Request $request, $id)
    {
        $user = $request->user();

        $account = FacebookAccount::where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        try {
            // Get updated page info
            $pageInfo = Http::get("https://graph.facebook.com/v19.0/{$account->facebook_page_id}", [
                'access_token' => $account->page_access_token,
                'fields' => 'id,name,category,followers_count,picture{url}',
            ]);

            if (!$pageInfo->successful()) {
                throw new \Exception('Failed to get page info from Facebook');
            }

            $data = $pageInfo->json();

            $account->update([
                'facebook_page_name' => $data['name'] ?? $account->facebook_page_name,
                'page_category' => $data['category'] ?? $account->page_category,
                'followers_count' => $data['followers_count'] ?? $account->followers_count,
                'last_synced_at' => now(),
                'is_connected' => true,
            ]);

            return redirect()->route('facebook.connect')
                ->with('success', 'Facebook page refreshed successfully');

        } catch (\Exception $e) {
            $account->update(['is_connected' => false]);

            return redirect()->route('facebook.connect')
                ->with('error', 'Failed to refresh Facebook page: ' . $e->getMessage());
        }
    }

    /**
     * Set default Facebook page
     */
    public function setDefault(Request $request, $id)
    {
        $user = $request->user();
        $organization = $user->organization;

        if (!$organization) {
            return redirect()->route('facebook.connect')
                ->with('error', 'Organization not found');
        }

        $account = FacebookAccount::where('id', $id)
            ->where('user_id', $user->id)
            ->where('organization_id', $organization->id)
            ->firstOrFail();

        // Update organization's default Facebook page
        $organization->update([
            'default_facebook_account_id' => $account->id,
        ]);

        return redirect()->route('facebook.connect')
            ->with('success', 'Default Facebook page set successfully');
    }
}
