<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\FacebookAccount;
use App\Models\Organization;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class FacebookAppController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * Show Facebook Apps management page
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $organization = $user->organization;

        if (!$organization) {
            return Inertia::render('Facebook/Apps/Index', [
                'apps' => [],
                'organization' => null,
                'defaultCallbackUrl' => route('facebook.callback'),
            ]);
        }

        // Get Facebook apps for this organization
        $apps = FacebookAccount::where('organization_id', $organization->id)
            ->whereNotNull('facebook_app_id')
            ->whereNotNull('facebook_app_secret')
            ->latest()
            ->get()
            ->map(function ($app) {
                return [
                    'id' => $app->id,
                    'app_name' => $app->app_name,
                    'facebook_app_id' => $app->facebook_app_id,
                    'facebook_app_secret' => $app->getMaskedAppSecret(),
                    'is_default_app' => $app->is_default_app,
                    'callback_url' => $app->callback_url,
                    'connected_pages_count' => FacebookAccount::where('facebook_app_id', $app->facebook_app_id)
                        ->whereNotNull('facebook_page_id')
                        ->count(),
                    'created_at' => $app->created_at->format('Y-m-d H:i:s'),
                ];
            });

        return Inertia::render('Facebook/Apps/Index', [
            'apps' => $apps,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'defaultCallbackUrl' => route('facebook.callback'),
        ]);
    }

    /**
     * Show create form for Facebook App
     */
    public function create()
    {
        return Inertia::render('Facebook/Apps/Create', [
            'defaultCallbackUrl' => route('facebook.callback'),
        ]);
    }

    /**
     * Store new Facebook App
     */
    public function store(Request $request)
    {
        $user = $request->user();
        $organization = $user->organization;

        if (!$organization) {
            return redirect()->back()
                ->withErrors(['error' => 'Organization not found'])
                ->withInput();
        }

        $validator = Validator::make($request->all(), [
            'app_name' => 'required|string|max:255',
            'facebook_app_id' => 'required|string|max:255',
            'facebook_app_secret' => 'required|string|max:255',
            'callback_url' => 'nullable|url',
            'is_default_app' => 'boolean',
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        // If setting as default, remove default from other apps
        if ($request->is_default_app) {
            FacebookAccount::where('organization_id', $organization->id)
                ->whereNotNull('facebook_app_id')
                ->update(['is_default_app' => false]);
        }

        // Create the app
        $app = FacebookAccount::create([
            'user_id' => $user->id,
            'organization_id' => $organization->id,
            'app_name' => $request->app_name,
            'facebook_app_id' => $request->facebook_app_id,
            'facebook_app_secret' => $request->facebook_app_secret,
            'callback_url' => $request->callback_url ?: route('facebook.callback'),
            'is_default_app' => $request->is_default_app ?? false,
        ]);

        return redirect()->route('facebook.apps.index')
            ->with('success', 'Facebook App created successfully');
    }

    /**
     * Show edit form for Facebook App
     */
    public function edit($id)
    {
        $app = FacebookAccount::whereNotNull('facebook_app_id')
            ->findOrFail($id);

        // Verify ownership
        $user = auth()->user();
        if ($app->user_id !== $user->id) {
            abort(403, 'Unauthorized');
        }

        return Inertia::render('Facebook/Apps/Edit', [
            'app' => [
                'id' => $app->id,
                'app_name' => $app->app_name,
                'facebook_app_id' => $app->facebook_app_id,
                'facebook_app_secret' => $app->facebook_app_secret, // Show full secret for editing
                'callback_url' => $app->callback_url,
                'is_default_app' => $app->is_default_app,
            ],
            'defaultCallbackUrl' => route('facebook.callback'),
        ]);
    }

    /**
     * Update Facebook App
     */
    public function update(Request $request, $id)
    {
        $app = FacebookAccount::whereNotNull('facebook_app_id')
            ->findOrFail($id);

        // Verify ownership
        $user = auth()->user();
        if ($app->user_id !== $user->id) {
            abort(403, 'Unauthorized');
        }

        $validator = Validator::make($request->all(), [
            'app_name' => 'required|string|max:255',
            'facebook_app_id' => 'required|string|max:255',
            'facebook_app_secret' => 'required|string|max:255',
            'callback_url' => 'nullable|url',
            'is_default_app' => 'boolean',
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        // If setting as default, remove default from other apps
        if ($request->is_default_app) {
            FacebookAccount::where('organization_id', $app->organization_id)
                ->where('id', '!=', $app->id)
                ->whereNotNull('facebook_app_id')
                ->update(['is_default_app' => false]);
        }

        $app->update([
            'app_name' => $request->app_name,
            'facebook_app_id' => $request->facebook_app_id,
            'facebook_app_secret' => $request->facebook_app_secret,
            'callback_url' => $request->callback_url ?: route('facebook.callback'),
            'is_default_app' => $request->is_default_app ?? $app->is_default_app,
        ]);

        return redirect()->route('facebook.apps.index')
            ->with('success', 'Facebook App updated successfully');
    }

    /**
     * Delete Facebook App
     */
    /**
     * Delete Facebook App
     */
    public function destroy(Request $request, $id)
    {
        try {
            // Debug: Log the request
            \Log::info('Delete app request', [
                'id' => $id,
                'user_id' => auth()->id(),
                'user' => auth()->user()->email,
            ]);

            // Find the app - check both with and without facebook_app_id
            $app = FacebookAccount::where('id', $id)
                ->where('user_id', auth()->id())
                ->first();

            if (!$app) {
                \Log::warning('App not found or unauthorized', [
                    'id' => $id,
                    'user_id' => auth()->id(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'App not found or you are not authorized to delete it.'
                ], 404);
            }

            // Check if it's actually an app (has facebook_app_id)
            if (!$app->facebook_app_id) {
                \Log::warning('Record is not a Facebook app', [
                    'id' => $id,
                    'type' => 'page',
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'This record is a Facebook page, not an app. Use the disconnect feature instead.'
                ], 400);
            }

            // Check if app has connected pages
            $connectedPages = FacebookAccount::where('organization_id', $app->organization_id)
                ->where('facebook_app_id', $app->facebook_app_id)
                ->whereNotNull('facebook_page_id')
                ->count();

            if ($connectedPages > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete app with connected Facebook pages. Disconnect pages first.'
                ], 400);
            }

            DB::beginTransaction();
            try {
                $app->delete();
                DB::commit();

                \Log::info('App deleted successfully', [
                    'id' => $id,
                    'app_name' => $app->app_name,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Facebook App deleted successfully'
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                \Log::error('Failed to delete app', [
                    'id' => $id,
                    'error' => $e->getMessage(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Failed to delete app: ' . $e->getMessage()
                ], 500);
            }

        } catch (\Exception $e) {
            \Log::error('Unexpected error in destroy method', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An unexpected error occurred: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test Facebook App credentials
     */
    public function test($id)
    {
        $app = FacebookAccount::whereNotNull('facebook_app_id')
            ->findOrFail($id);

        // Verify ownership
        $user = auth()->user();
        if ($app->user_id !== $user->id) {
            abort(403, 'Unauthorized');
        }

        try {
            // Test app credentials using Facebook Graph API
            $response = \Illuminate\Support\Facades\Http::get('https://graph.facebook.com/debug_token', [
                'input_token' => $app->facebook_app_id . '|' . $app->facebook_app_secret,
                'access_token' => $app->facebook_app_id . '|' . $app->facebook_app_secret,
            ]);

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Facebook App credentials are valid',
                    'data' => $response->json(),
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Invalid Facebook App credentials',
                'data' => $response->json(),
            ], 400);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error testing Facebook App: ' . $e->getMessage(),
            ], 500);
        }
    }
}
