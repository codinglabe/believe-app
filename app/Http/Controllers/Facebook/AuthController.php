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
     * Show Facebook connection page
     */
    public function connect(Request $request)
    {
        $user = $request->user();
        $organization = $user->organization;

        if (!$organization) {
            return redirect()->route('dashboard')
                ->with('error', 'You need to have an organization to connect Facebook');
        }

        $accounts = FacebookAccount::where('organization_id', $organization->id)
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
                    'is_token_expired' => $account->is_token_expired,
                ];
            });

        $oauthUrl = $this->authService->getOAuthUrl($organization->id);

        return Inertia::render('Facebook/Connect', [
            'accounts' => $accounts,
            'oauthUrl' => $oauthUrl,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
        ]);
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

        DB::beginTransaction();

        try {
            // Get access token
            $tokenData = $this->authService->getAccessToken($request->code);

            if (!isset($tokenData['access_token'])) {
                throw new \Exception('Failed to get access token from Facebook');
            }

            // Get long-lived token
            $longLivedToken = $this->authService->getLongLivedToken($tokenData['access_token']);

            // Get user's pages
            $pages = $this->authService->getUserPages($longLivedToken['access_token']);

            if (empty($pages)) {
                throw new \Exception('No Facebook pages found for this account');
            }

            // Save each page
            foreach ($pages as $page) {
                FacebookAccount::updateOrCreate(
                    [
                        'organization_id' => $organization->id,
                        'facebook_page_id' => $page['id'],
                    ],
                    [
                        'user_id' => $user->id,
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
                ->with('success', 'Successfully connected ' . count($pages) . ' Facebook page(s)');

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
            ->firstOrFail();

        try {
            // Try to revoke token from Facebook
            $this->authService->revokeToken($account->facebook_page_id, $account->page_access_token);
        } catch (\Exception $e) {
            \Log::warning('Failed to revoke Facebook token: ' . $e->getMessage());
        }

        $account->delete();

        return redirect()->route('facebook.connect')
            ->with('success', 'Facebook page disconnected successfully');
    }

    /**
     * Reconnect/refresh Facebook page
     */
    public function refresh(Request $request, $id)
    {
        $user = $request->user();
        $organization = $user->organization;

        $account = FacebookAccount::where('id', $id)
            ->where('organization_id', $organization->id)
            ->firstOrFail();

        try {
            // Get updated page info
            $pageInfo = $this->postService->getPageInfo($account);

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
            ->firstOrFail();

        // Update organization's default Facebook page
        $organization->update([
            'default_facebook_account_id' => $account->id,
        ]);

        return redirect()->route('facebook.connect')
            ->with('success', 'Default Facebook page set successfully');
    }
}
