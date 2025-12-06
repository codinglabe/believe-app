<?php

namespace App\Http\Controllers\Facebook;

use App\Http\Controllers\Controller;
use App\Models\FacebookAccount;
use App\Models\FacebookPost;
use App\Models\Organization;
use App\Services\Facebook\ConnectionService;
use App\Services\Facebook\PostService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class PostController extends Controller
{
    protected $postService;
    protected $connectionService;

    public function __construct(PostService $postService, ConnectionService $connectionService)
    {
        $this->postService = $postService;
        $this->connectionService = $connectionService;
        $this->middleware('auth');
    }

    /**
     * Display Facebook posts dashboard
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $organization = $user->organization;

        if (!$organization) {
            return redirect()->route('dashboard')
                ->with('error', 'You need to have an organization to manage Facebook posts');
        }

        // Get connected accounts
        $accounts = FacebookAccount::where('organization_id', $organization->id)
            ->connected()
            ->get()
            ->map(function ($account) {
                return [
                    'id' => $account->id,
                    'facebook_page_name' => $account->facebook_page_name,
                    'picture_url' => $account->getPagePictureUrl('small'),
                ];
            });

        // Get posts for this organization
        $posts = FacebookPost::where('organization_id', $organization->id)
            ->with('facebookAccount')
            ->latest()
            ->paginate(20)
            ->through(function ($post) {
                return [
                    'id' => $post->id,
                    'message' => Str::limit($post->message, 100),
                    'full_message' => $post->formatted_message,
                    'link' => $post->link,
                    'image' => $post->image ? Storage::url($post->image) : null,
                    'video' => $post->video ? Storage::url($post->video) : null,
                    'status' => $post->status,
                    'scheduled_for' => $post->scheduled_for?->format('Y-m-d H:i:s'),
                    'published_at' => $post->published_at?->format('Y-m-d H:i:s'),
                    'created_at' => $post->created_at->format('Y-m-d H:i:s'),
                    'facebook_post_id' => $post->facebook_post_id,
                    'response_data' => $post->response_data,
                    'error_message' => $post->error_message,
                    'facebook_account' => $post->facebookAccount ? [
                        'id' => $post->facebookAccount->id,
                        'facebook_page_name' => $post->facebookAccount->facebook_page_name,
                        'picture_url' => $post->facebookAccount->getPagePictureUrl('small'),
                    ] : null,
                ];
            });

        return Inertia::render('Facebook/Posts/Index', [
            'posts' => $posts,
            'accounts' => $accounts,
            'hasConnectedAccounts' => $accounts->count() > 0,
            'filters' => [
                'status' => $request->input('status', ''),
                'account_id' => $request->input('account_id', ''),
                'search' => $request->input('search', ''),
            ],
        ]);
    }

    /**
     * Show create form
     */
    public function create(Request $request)
    {
        $user = $request->user();
        $organization = $user->organization;

        if (!$organization) {
            return redirect()->route('dashboard')
                ->with('error', 'You need to have an organization to create Facebook posts');
        }

        // Check Facebook connection
        $facebookConnected = $this->connectionService->isOrganizationConnected($organization);
        $connectedAccount = $this->connectionService->getConnectedAccount($organization);

        // Get accounts for dropdown
        $accounts = FacebookAccount::where('organization_id', $organization->id)
            ->connected()
            ->get()
            ->map(function ($account) {
                return [
                    'id' => $account->id,
                    'facebook_page_name' => $account->facebook_page_name,
                    'picture_url' => $account->getPagePictureUrl('small'),
                    'followers_count' => $account->followers_count,
                ];
            });

        return Inertia::render('Facebook/Posts/Create', [
            'accounts' => $accounts,
            'facebookConnected' => $facebookConnected,
            'connectedAccount' => $connectedAccount ? [
                'id' => $connectedAccount->id,
                'name' => $connectedAccount->facebook_page_name,
                'picture_url' => $connectedAccount->getPagePictureUrl('small'),
            ] : null,
            'hasConnectedAccounts' => $accounts->count() > 0,
        ]);
    }

    /**
     * Store new post
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

        \Log::info('Facebook post store request received', [
            'user_id' => $user->id,
            'has_image' => $request->hasFile('image'),
            'has_video' => $request->hasFile('video'),
            'schedule_type' => $request->schedule_type,
        ]);

        $validator = Validator::make($request->all(), [
            'message' => 'required|string|max:5000',
            'link' => 'nullable|url',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,gif,bmp|max:10240', // Strict validation
            'video' => 'nullable|mimes:mp4,mov,avi|max:51200',
            'schedule_type' => 'required|in:now,later',
            'scheduled_date' => 'required_if:schedule_type,later|date|after:now',
            'scheduled_time' => 'required_if:schedule_type,later',
            'facebook_account_id' => 'required|exists:facebook_accounts,id',
        ], [
            'image.image' => 'The file must be an image',
            'image.mimes' => 'Only JPG, JPEG, PNG, GIF, and BMP images are allowed',
            'image.max' => 'Image size must be less than 10MB',
        ]);

        if ($validator->fails()) {
            \Log::error('Validation failed:', $validator->errors()->toArray());
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        // Verify account belongs to organization
        $account = FacebookAccount::where('id', $request->facebook_account_id)
            ->where('organization_id', $organization->id)
            ->connected()
            ->first();

        if (!$account) {
            return redirect()->back()
                ->withErrors(['facebook_account_id' => 'Invalid Facebook account or account is not connected'])
                ->withInput();
        }

        // Handle file uploads
        $imagePath = null;
        $videoPath = null;

        if ($request->hasFile('image')) {
            $image = $request->file('image');

            \Log::info('Uploaded image details:', [
                'name' => $image->getClientOriginalName(),
                'size' => $image->getSize(),
                'mime' => $image->getMimeType(),
                'extension' => $image->getClientOriginalExtension(),
            ]);

            // Convert to JPEG if needed (Facebook prefers JPEG)
            $imagePath = $this->processAndStoreImage($image);
        }

        if ($request->hasFile('video')) {
            $videoPath = $request->file('video')->store('facebook/videos', 'public');
        }

        // Determine status and scheduled time
        $status = 'draft';
        $scheduledFor = null;

        if ($request->schedule_type === 'later') {
            $status = 'pending';
            $scheduledFor = $request->scheduled_date . ' ' . $request->scheduled_time . ':00';
        }

        // Create post record
        $post = FacebookPost::create([
            'user_id' => $user->id,
            'organization_id' => $organization->id,
            'facebook_account_id' => $account->id,
            'message' => $request->message,
            'link' => $request->link,
            'image' => $imagePath,
            'video' => $videoPath,
            'status' => $status,
            'scheduled_for' => $scheduledFor ? \Carbon\Carbon::parse($scheduledFor) : null,
        ]);

        \Log::info('Facebook post created', ['post_id' => $post->id]);

        // Post immediately if scheduled for now
        if ($request->schedule_type === 'now') {
            try {
                $this->publishPost($post->id);
                return redirect()->route('facebook.posts.index')
                    ->with('success', 'Post published successfully to Facebook!');

            } catch (\Exception $e) {
                \Log::error('Facebook publish error:', [
                    'message' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);

                $errorMessage = $e->getMessage();

                // Provide user-friendly error messages
                if (strpos($errorMessage, 'Invalid image format') !== false) {
                    $errorMessage = 'Invalid image format. Please upload a JPG, PNG, or GIF image.';
                }

                if (strpos($errorMessage, 'file is too large') !== false) {
                    $errorMessage = 'Image file is too large. Maximum size is 10MB.';
                }

                return redirect()->back()
                    ->withErrors(['publish_error' => $errorMessage])
                    ->withInput();
            }
        }

        return redirect()->route('facebook.posts.index')
            ->with('success', 'Post scheduled successfully!');
    }

    /**
     * Publish a post immediately
     */
    public function publish($id)
    {
        try {
            return $this->publishPost($id);
        } catch (\Exception $e) {
            return redirect()->back()
                ->with('error', 'Failed to publish post: ' . $e->getMessage());
        }
    }

     /**
     * Process and store image - convert to JPEG if needed
     */
    private function processAndStoreImage($imageFile)
    {
        try {
            // Create directory if not exists
            $directory = 'facebook/images';
            Storage::disk('public')->makeDirectory($directory);

            // Generate unique filename with .jpg extension
            $filename = uniqid() . '.jpg';
            $path = $directory . '/' . $filename;

            // Convert image to JPEG using Intervention Image
            $manager = new ImageManager(new Driver());
            $image = $manager->read($imageFile->getRealPath());

            // Convert to RGB and save as JPEG
            $image->toJpeg(90)->save(storage_path('app/public/' . $path));

            \Log::info('Image processed and saved:', [
                'original_mime' => $imageFile->getMimeType(),
                'saved_path' => $path,
                'size' => Storage::disk('public')->size($path),
            ]);

            return $path;

        } catch (\Exception $e) {
            \Log::error('Image processing failed:', [
                'error' => $e->getMessage(),
            ]);

            // Fallback to original upload
            return $imageFile->store('facebook/images', 'public');
        }
    }

    /**
     * Publish post helper
     */
    private function publishPost($id)
    {
        $post = FacebookPost::with('facebookAccount')->findOrFail($id);

        if ($post->status === 'published') {
            throw new \Exception('Post is already published');
        }

        if (!$post->facebookAccount || !$post->facebookAccount->is_connected) {
            throw new \Exception('Facebook account is not connected');
        }

        \Log::info('Publishing post to Facebook:', [
            'post_id' => $post->id,
            'account_id' => $post->facebookAccount->id,
            'has_image' => !empty($post->image),
            'has_video' => !empty($post->video),
        ]);

        try {
            $response = null;

            if ($post->video) {
                $videoPath = Storage::disk('public')->path($post->video);
                $response = $this->postService->postWithVideo(
                    $post->facebookAccount,
                    $post->message,
                    $videoPath,
                    $post->message
                );
            } elseif ($post->image) {
                $imagePath = Storage::disk('public')->path($post->image);

                \Log::info('Publishing image:', [
                    'image_path' => $imagePath,
                    'exists' => file_exists($imagePath),
                    'size' => filesize($imagePath),
                    'mime' => mime_content_type($imagePath),
                ]);

                $response = $this->postService->postWithImage(
                    $post->facebookAccount,
                    $post->message,
                    $imagePath,
                    $post->link
                );
            } else {
                $response = $this->postService->postMessage(
                    $post->facebookAccount,
                    $post->message,
                    $post->link
                );
            }

            // Update post with Facebook response
            $post->update([
                'status' => 'published',
                'published_at' => now(),
                'facebook_post_id' => $response['id'] ?? null,
                'response_data' => $response,
                'error_message' => null,
            ]);

            \Log::info('Post published successfully:', ['facebook_post_id' => $response['id'] ?? null]);

            return $response;

        } catch (\Exception $e) {
            \Log::error('Failed to publish post:', [
                'post_id' => $post->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $post->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'response_data' => ['error' => $e->getMessage()],
            ]);

            throw $e;
        }
    }

    /**
     * Delete a post
     */
    public function destroy($id)
    {
        $post = FacebookPost::with('facebookAccount')->findOrFail($id);

        // Verify post belongs to user's organization
        $user = auth()->user();
        if ($post->organization_id !== $user->organization->id) {
            abort(403, 'Unauthorized');
        }

        // Delete from Facebook if published
        if ($post->facebook_post_id && $post->status === 'published' && $post->facebookAccount) {
            try {
                $this->postService->deletePost($post->facebookAccount, $post->facebook_post_id);
            } catch (\Exception $e) {
                \Log::error('Failed to delete Facebook post: ' . $e->getMessage());
            }
        }

        // Delete local files
        if ($post->image) {
            Storage::disk('public')->delete($post->image);
        }

        if ($post->video) {
            Storage::disk('public')->delete($post->video);
        }

        $post->delete();

        return redirect()->route('facebook.posts.index')
            ->with('success', 'Post deleted successfully');
    }

    /**
     * Get post analytics
     */
    public function analytics($id)
    {
        $post = FacebookPost::with('facebookAccount')->findOrFail($id);

        // Verify post belongs to user's organization
        $user = auth()->user();
        if ($post->organization_id !== $user->organization->id) {
            abort(403, 'Unauthorized');
        }

        if (!$post->facebook_post_id || !$post->facebookAccount) {
            return response()->json([
                'success' => false,
                'message' => 'Post not published or Facebook account not connected',
            ]);
        }

        try {
            $insights = $this->postService->getPageInsights($post->facebookAccount);

            return response()->json([
                'success' => true,
                'data' => $insights,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
