<?php

namespace App\Http\Controllers\Facebook;

use App\Http\Controllers\Controller;
use App\Models\FacebookAccount;
use App\Services\Facebook\EngagementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class AuthController extends Controller
{
    protected string $appId;

    protected string $appSecret;

    protected string $redirectUri;

    protected string $apiVersion;

    public function __construct()
    {
        $this->appId = (string) config('services.facebook.app_id');
        $this->appSecret = (string) config('services.facebook.app_secret');
        $this->redirectUri = (string) config('services.facebook.redirect_uri');
        $this->apiVersion = (string) config('facebook.api_version', 'v21.0');
        $this->middleware('auth');
    }

    /**
     * Show Facebook connection page.
     */
    public function connect(Request $request)
    {
        $user = $request->user();
        $organization = $user->organization;

        if (! $organization) {
            return redirect()->route('dashboard')
                ->with('error', 'You need to have an organization to connect Facebook');
        }

        $accounts = FacebookAccount::where('user_id', $user->id)
            ->where('organization_id', $organization->id)
            ->latest()
            ->get()
            ->map(fn ($account) => [
                'id' => $account->id,
                'facebook_page_id' => $account->facebook_page_id,
                'facebook_page_name' => $account->facebook_page_name,
                'page_category' => $account->page_category,
                'followers_count' => $account->followers_count,
                'is_connected' => $account->is_connected,
                'last_synced_at' => $account->last_synced_at?->format('Y-m-d H:i:s'),
                'picture_url' => $account->getPagePictureUrl('small'),
                'is_token_expired' => $account->isTokenExpired(),
            ]);

        return Inertia::render('Facebook/Connect', [
            'accounts' => $accounts,
            'hasConnectedAccounts' => $accounts->count() > 0,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'requestedScopes' => config('facebook.scopes', []),
            'privacyPolicyUrl' => url('/privacy-policy'),
        ]);
    }

    /**
     * Redirect to Facebook OAuth after in-app permission disclosure.
     */
    public function redirectToFacebook(Request $request)
    {
        $state = base64_encode(json_encode([
            'user_id' => auth()->id(),
            'time' => time(),
            'nonce' => bin2hex(random_bytes(8)),
        ]));

        $params = [
            'client_id' => $this->appId,
            'redirect_uri' => $this->redirectUri,
            'state' => $state,
            'scope' => implode(',', config('facebook.scopes', [])),
            'response_type' => 'code',
            'auth_type' => 'rerequest',
        ];

        $url = "https://www.facebook.com/{$this->apiVersion}/dialog/oauth?".http_build_query($params);

        return redirect($url);
    }

    /**
     * OAuth callback — fetch pages, store in session, send user to page picker (pages_show_list).
     */
    public function callback(Request $request)
    {
        if ($request->has('error')) {
            return redirect()->route('facebook.connect')
                ->with('error', 'Facebook authorization was cancelled or denied.');
        }

        $request->validate([
            'code' => 'required|string',
            'state' => 'required|string',
        ]);

        $user = $request->user();
        $organization = $user->organization;

        if (! $organization) {
            return redirect()->route('facebook.connect')
                ->with('error', 'Organization not found');
        }

        $state = json_decode(base64_decode($request->state), true);
        if (! is_array($state) || (int) ($state['user_id'] ?? 0) !== (int) $user->id) {
            return redirect()->route('facebook.connect')
                ->with('error', 'Invalid OAuth state. Please try connecting again.');
        }

        try {
            $tokenData = $this->exchangeCodeForToken($request->code);
            $userAccessToken = $tokenData['access_token'];

            $facebookUser = $this->fetchFacebookUser($userAccessToken);
            $longLived = $this->exchangeForLongLivedToken($userAccessToken);
            $longLivedToken = $longLived['token'];
            $expiresIn = $longLived['expires_in'];

            $pages = $this->fetchManagedPages($longLivedToken);

            if ($pages === []) {
                throw new \Exception('No Facebook pages found. You must be an admin of at least one Page to connect.');
            }

            $request->session()->put(config('facebook.oauth.session_key'), [
                'user_id' => $user->id,
                'organization_id' => $organization->id,
                'facebook_user_id' => $facebookUser['id'],
                'facebook_user_name' => $facebookUser['name'],
                'token_expires_at' => now()->addSeconds($expiresIn)->toIso8601String(),
                'pages' => $pages,
                'created_at' => now()->toIso8601String(),
            ]);

            return redirect()->route('facebook.select-pages')
                ->with('success', 'Choose which Facebook Page(s) to connect to your organization.');

        } catch (\Exception $e) {
            Log::error('Facebook OAuth error: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return redirect()->route('facebook.connect')
                ->with('error', 'Failed to connect Facebook: '.$e->getMessage());
        }
    }

    /**
     * Page picker — demonstrates pages_show_list before saving tokens.
     */
    public function selectPages(Request $request)
    {
        $pending = $this->pendingOAuth($request);
        if (! $pending) {
            return redirect()->route('facebook.connect')
                ->with('error', 'Your Facebook session expired. Please connect again.');
        }

        $pages = collect($pending['pages'] ?? [])->map(fn ($page) => [
            'id' => $page['id'],
            'name' => $page['name'],
            'category' => $page['category'] ?? null,
            'followers_count' => $page['followers_count'] ?? 0,
            'picture_url' => $page['picture']['data']['url'] ?? null,
        ])->values();

        return Inertia::render('Facebook/SelectPages', [
            'pages' => $pages,
            'facebookUserName' => $pending['facebook_user_name'] ?? 'Facebook User',
            'organizationName' => $request->user()->organization?->name ?? 'Your Organization',
        ]);
    }

    /**
     * Save only the Pages the user selected (required for App Review screencast).
     */
    public function storeSelectedPages(Request $request)
    {
        $pending = $this->pendingOAuth($request);
        if (! $pending) {
            return redirect()->route('facebook.connect')
                ->with('error', 'Your Facebook session expired. Please connect again.');
        }

        $validated = $request->validate([
            'page_ids' => 'required|array|min:1',
            'page_ids.*' => 'required|string',
        ]);

        $user = $request->user();
        $organization = $user->organization;

        if (! $organization || (int) $pending['organization_id'] !== (int) $organization->id) {
            return redirect()->route('facebook.connect')
                ->with('error', 'Organization mismatch. Please connect again.');
        }

        $selectedIds = array_flip($validated['page_ids']);
        $pagesToSave = collect($pending['pages'] ?? [])
            ->filter(fn ($page) => isset($selectedIds[$page['id']]))
            ->values();

        if ($pagesToSave->isEmpty()) {
            return redirect()->route('facebook.select-pages')
                ->with('error', 'Select at least one Facebook Page to continue.');
        }

        DB::beginTransaction();

        try {
            $expiresAt = isset($pending['token_expires_at'])
                ? \Carbon\Carbon::parse($pending['token_expires_at'])
                : now()->addDays(60);

            foreach ($pagesToSave as $page) {
                FacebookAccount::updateOrCreate(
                    [
                        'user_id' => $user->id,
                        'organization_id' => $organization->id,
                        'facebook_page_id' => $page['id'],
                    ],
                    [
                        'facebook_user_id' => $pending['facebook_user_id'],
                        'facebook_user_name' => $pending['facebook_user_name'],
                        'facebook_page_name' => $page['name'],
                        'page_access_token' => $page['access_token'],
                        'page_category' => $page['category'] ?? null,
                        'followers_count' => $page['followers_count'] ?? 0,
                        'page_data' => $page,
                        'is_connected' => true,
                        'last_synced_at' => now(),
                        'token_expires_at' => $expiresAt,
                    ]
                );
            }

            DB::commit();
            $request->session()->forget(config('facebook.oauth.session_key'));

            return redirect()->route('facebook.connect')
                ->with('success', 'Connected '.$pagesToSave->count().' Facebook Page(s). You can now create posts and view engagement.');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Facebook page save error: '.$e->getMessage());

            return redirect()->route('facebook.select-pages')
                ->with('error', 'Failed to save selected pages: '.$e->getMessage());
        }
    }

    /**
     * Page engagement summary (pages_read_engagement) for Connect UI / App Review.
     */
    public function engagement(Request $request, int $id, EngagementService $engagementService)
    {
        $account = FacebookAccount::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        try {
            return response()->json([
                'success' => true,
                'data' => $engagementService->getPageEngagementSummary($account),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function disconnect(Request $request, $id)
    {
        $user = $request->user();

        $account = FacebookAccount::where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        try {
            Http::delete("https://graph.facebook.com/{$this->apiVersion}/{$account->facebook_page_id}/permissions", [
                'access_token' => $account->page_access_token,
            ]);
        } catch (\Exception $e) {
            Log::warning('Failed to revoke Facebook token: '.$e->getMessage());
        }

        $account->delete();

        return redirect()->route('facebook.connect')
            ->with('success', 'Facebook page disconnected successfully');
    }

    public function refresh(Request $request, $id)
    {
        $user = $request->user();

        $account = FacebookAccount::where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        try {
            $pageInfo = Http::get("https://graph.facebook.com/{$this->apiVersion}/{$account->facebook_page_id}", [
                'access_token' => $account->page_access_token,
                'fields' => 'id,name,category,followers_count,picture{url}',
            ]);

            if (! $pageInfo->successful()) {
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
                ->with('error', 'Failed to refresh Facebook page: '.$e->getMessage());
        }
    }

    public function setDefault(Request $request, $id)
    {
        $user = $request->user();
        $organization = $user->organization;

        if (! $organization) {
            return redirect()->route('facebook.connect')
                ->with('error', 'Organization not found');
        }

        $account = FacebookAccount::where('id', $id)
            ->where('user_id', $user->id)
            ->where('organization_id', $organization->id)
            ->firstOrFail();

        $organization->update([
            'default_facebook_account_id' => $account->id,
        ]);

        return redirect()->route('facebook.connect')
            ->with('success', 'Default Facebook page set successfully');
    }

    /**
     * @return array<string, mixed>|null
     */
    private function pendingOAuth(Request $request): ?array
    {
        $pending = $request->session()->get(config('facebook.oauth.session_key'));
        if (! is_array($pending)) {
            return null;
        }

        $created = isset($pending['created_at']) ? \Carbon\Carbon::parse($pending['created_at']) : null;
        $ttl = (int) config('facebook.oauth.session_ttl_minutes', 30);
        if ($created && $created->lt(now()->subMinutes($ttl))) {
            $request->session()->forget(config('facebook.oauth.session_key'));

            return null;
        }

        if ((int) ($pending['user_id'] ?? 0) !== (int) $request->user()->id) {
            return null;
        }

        return $pending;
    }

    /**
     * @return array<string, mixed>
     */
    private function exchangeCodeForToken(string $code): array
    {
        $response = Http::get("https://graph.facebook.com/{$this->apiVersion}/oauth/access_token", [
            'client_id' => $this->appId,
            'client_secret' => $this->appSecret,
            'redirect_uri' => $this->redirectUri,
            'code' => $code,
        ]);

        if (! $response->successful()) {
            Log::error('Facebook token error: '.$response->body());
            throw new \Exception('Failed to get access token from Facebook');
        }

        return $response->json();
    }

    /**
     * @return array{id: string, name: string}
     */
    private function fetchFacebookUser(string $accessToken): array
    {
        $response = Http::get("https://graph.facebook.com/{$this->apiVersion}/me", [
            'access_token' => $accessToken,
            'fields' => 'id,name',
        ]);

        if (! $response->successful()) {
            throw new \Exception('Failed to get user info from Facebook');
        }

        return $response->json();
    }

    /**
     * @return array{token: string, expires_in: int}
     */
    private function exchangeForLongLivedToken(string $shortLivedToken): array
    {
        $response = Http::get("https://graph.facebook.com/{$this->apiVersion}/oauth/access_token", [
            'grant_type' => 'fb_exchange_token',
            'client_id' => $this->appId,
            'client_secret' => $this->appSecret,
            'fb_exchange_token' => $shortLivedToken,
        ]);

        if (! $response->successful()) {
            Log::warning('Could not get long-lived token, using short-lived');

            return ['token' => $shortLivedToken, 'expires_in' => 3600];
        }

        $data = $response->json();

        return [
            'token' => $data['access_token'],
            'expires_in' => (int) ($data['expires_in'] ?? 5184000),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function fetchManagedPages(string $accessToken): array
    {
        $response = Http::get("https://graph.facebook.com/{$this->apiVersion}/me/accounts", [
            'access_token' => $accessToken,
            'fields' => 'id,name,category,followers_count,access_token,picture{url}',
            'limit' => 200,
        ]);

        if (! $response->successful()) {
            throw new \Exception('Failed to get pages from Facebook');
        }

        return $response->json('data', []);
    }
}
