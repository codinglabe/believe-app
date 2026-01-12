<?php

namespace App\Http\Controllers\Facebook;

use App\Http\Controllers\Controller;
use App\Models\FacebookAccount;
use App\Models\Organization;
use App\Services\Facebook\AuthService;
use App\Services\Facebook\PostService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller
{
    protected $authService;
    protected $postService;

    public function __construct(AuthService $authService, PostService $postService)
    {
        $this->authService = $authService;
        $this->postService = $postService;
        $this->middleware('auth');
    }

    /**
     * Show Facebook connection page with app selection
     */
    public function connect(Request $request)
    {
        $user = $request->user();
        $organization = $user->organization;

        if (!$organization) {
            return Inertia::render('Facebook/Connect', [
                'apps' => [],
                'accounts' => [],
                'organization' => null,
            ]);
        }

        // Get Facebook apps for this organization
        $apps = FacebookAccount::where('organization_id', $organization->id)
            ->whereNotNull('facebook_app_id')
            ->whereNotNull('facebook_app_secret')
            ->latest()
            ->get()
            ->map(function ($app) use ($organization) {
                return [
                    'id' => $app->id,
                    'app_name' => $app->app_name,
                    'facebook_app_id' => $app->facebook_app_id,
                    'is_default_app' => $app->is_default_app,
                    'connected_pages_count' => FacebookAccount::where('organization_id', $organization->id)
                        ->where('facebook_app_id', $app->facebook_app_id)
                        ->whereNotNull('facebook_page_id')
                        ->count(),
                ];
            });

        // Get connected pages for this organization
        $accounts = FacebookAccount::where('organization_id', $organization->id)
            ->whereNotNull('facebook_page_id')
            ->latest()
            ->get()
            ->map(function ($account) {
                return [
                    'id' => $account->id,
                    'app_id' => $account->facebook_app_id,
                    'app_name' => $account->app_name,
                    'facebook_page_id' => $account->facebook_page_id,
                    'facebook_page_name' => $account->facebook_page_name,
                    'page_category' => $account->page_category,
                    'followers_count' => $account->followers_count,
                    'is_connected' => $account->is_connected,
                    'last_synced_at' => $account->last_synced_at?->format('Y-m-d H:i:s'),
                    'picture_url' => $account->getPagePictureUrl('small'),
                    'is_token_expired' => $account->is_token_expired,
                ];
            });

        return Inertia::render('Facebook/Connect', [
            'apps' => $apps,
            'accounts' => $accounts,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
        ]);
    }


    /**
     * Generate OAuth URL for specific app
     */
    public function generateOAuthUrl(Request $request)
    {
        $request->validate([
            'app_id' => 'required|exists:facebook_accounts,id',
        ]);

        $user = $request->user();
        $organization = $user->organization;

        if (!$organization) {
            return response()->json([
                'success' => false,
                'message' => 'Organization not found'
            ], 400);
        }

        $app = FacebookAccount::where('id', $request->app_id)
            ->where('organization_id', $organization->id)
            ->whereNotNull('facebook_app_id')
            ->whereNotNull('facebook_app_secret')
            ->firstOrFail();

        try {
            $oauthUrl = $this->authService->getOAuthUrlForApp(
                $app->facebook_app_id,
                $app->facebook_app_secret,
                $app->callback_url ?: route('facebook.callback')
            );

            return response()->json([
                'success' => true,
                'oauth_url' => $oauthUrl,
                'app_name' => $app->app_name,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate OAuth URL: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Handle Facebook OAuth callback
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

        // Decode state to get app_id
        $state = json_decode(base64_decode($request->state), true);
        $appId = $state['app_id'] ?? null;

        if (!$appId) {
            return redirect()->route('facebook.connect')
                ->with('error', 'Invalid OAuth state');
        }

        $app = FacebookAccount::where('id', $appId)
            ->where('organization_id', $organization->id)
            ->whereNotNull('facebook_app_id')
            ->whereNotNull('facebook_app_secret')
            ->firstOrFail();

        DB::beginTransaction();

        try {
            // Get access token using app credentials
            $tokenData = $this->authService->getAccessTokenForApp(
                $request->code,
                $app->facebook_app_id,
                $app->facebook_app_secret,
                $app->callback_url ?: route('facebook.callback')
            );

            if (!isset($tokenData['access_token'])) {
                throw new \Exception('Failed to get access token from Facebook');
            }

            // Get long-lived token
            $longLivedToken = $this->authService->getLongLivedTokenForApp(
                $tokenData['access_token'],
                $app->facebook_app_id,
                $app->facebook_app_secret
            );

            // Get user's pages
            $pages = $this->authService->getUserPages($longLivedToken['access_token']);

            if (empty($pages)) {
                throw new \Exception('No Facebook pages found for this account');
            }

            // Save each page with app reference
            foreach ($pages as $page) {
                FacebookAccount::updateOrCreate(
                    [
                        'organization_id' => $organization->id,
                        'facebook_page_id' => $page['id'],
                    ],
                    [
                        'user_id' => $user->id,
                        'facebook_app_id' => $app->facebook_app_id,
                        'facebook_app_secret' => $app->facebook_app_secret,
                        'app_name' => $app->app_name,
                        'callback_url' => $app->callback_url,
                        'facebook_page_name' => $page['name'],
                        'page_access_token' => $page['access_token'],
                        'page_category' => $page['category'] ?? null,
                        'followers_count' => $page['followers_count'] ?? 0,
                        'page_data' => $page,
                        'is_connected' => true,
                        'last_synced_at' => now(),
                        'token_expires_at' => now()->addDays(60), // Long-lived tokens expire in 60 days
                    ]
                );
            }

            DB::commit();

            return redirect()->route('facebook.connect')
                ->with('success', 'Successfully connected ' . count($pages) . ' Facebook page(s) using ' . $app->app_name);

        } catch (\Exception $e) {
            DB::rollBack();

            \Log::error('Facebook OAuth error: ' . $e->getMessage());

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
        $organization = $user->organization;

        $account = FacebookAccount::where('id', $id)
            ->where('organization_id', $organization->id)
            ->whereNotNull('facebook_page_id')
            ->firstOrFail();

        try {
            // Try to revoke token from Facebook
            $this->authService->revokeToken(
                $account->facebook_page_id,
                $account->page_access_token,
                $account->facebook_app_id,
                $account->facebook_app_secret
            );
        } catch (\Exception $e) {
            \Log::warning('Failed to revoke Facebook token: ' . $e->getMessage());
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
        $organization = $user->organization;

        $account = FacebookAccount::where('id', $id)
            ->where('organization_id', $organization->id)
            ->whereNotNull('facebook_page_id')
            ->firstOrFail();

        if (!$account->hasValidAppCredentials()) {
            return redirect()->route('facebook.connect')
                ->with('error', 'Facebook app credentials are missing for this page');
        }

        try {
            // Get updated page info using app-specific service
            $pageInfo = $this->postService->getPageInfoForApp($account);

            $account->update([
                'facebook_page_name' => $pageInfo['name'] ?? $account->facebook_page_name,
                'page_category' => $pageInfo['category'] ?? $account->page_category,
                'followers_count' => $pageInfo['followers_count'] ?? $account->followers_count,
                'page_data' => $pageInfo,
                'last_synced_at' => now(),
                'is_connected' => true,
            ]);

            return redirect()->route('facebook.connect')
                ->with('success', 'Facebook page refreshed successfully');

        } catch (\Exception $e) {
            // Mark as disconnected if token is invalid
            $account->update(['is_connected' => false]);

            return redirect()->route('facebook.connect')
                ->with('error', 'Failed to refresh Facebook page: ' . $e->getMessage());
        }
    }

    /**
     * Set default Facebook page for organization
     */
    public function setDefault(Request $request, $id)
    {
        $user = $request->user();
        $organization = $user->organization;

        $account = FacebookAccount::where('id', $id)
            ->where('organization_id', $organization->id)
            ->whereNotNull('facebook_page_id')
            ->firstOrFail();

        // Update organization's default Facebook page
        $organization->update([
            'default_facebook_account_id' => $account->id,
        ]);

        return redirect()->route('facebook.connect')
            ->with('success', 'Default Facebook page set successfully');
    }
}
