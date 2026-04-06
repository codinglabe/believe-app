<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\UserFavoriteOrganization;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FollowerController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // User must have an organization
        $organization = $user->organization;
        if (!$organization) {
            abort(403, 'You do not have an organization');
        }

        // Check if user owns the organization
        if ($organization->user_id !== $user->id) {
            abort(403, 'Unauthorized');
        }

        $perPage = $request->input('per_page', 15);
        $search = $request->input('search', '');
        $allowedPerPage = [10, 15, 25, 50, 100];

        $followers = UserFavoriteOrganization::query()
            ->with(['user' => function ($query) {
                $query->select('id', 'name', 'email', 'image', 'created_at', 'role')
                    ->with(['organization.user:id,slug']);
            }])
            ->where('organization_id', $organization->id)
            ->when($search, function ($query, $search) {
                $query->where(function ($outer) use ($search) {
                    $outer->whereHas('user', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    })->orWhereHas('user', function ($q) use ($search) {
                        $q->whereIn('role', ['organization', 'organization_pending'])
                            ->whereHas('organization', function ($oq) use ($search) {
                                $oq->where('name', 'like', "%{$search}%");
                            });
                    });
                });
            })
            ->orderBy('created_at', 'desc')
            ->paginate($perPage)
            ->withQueryString();

        $userIds = $followers->getCollection()->pluck('user_id')->unique()->filter()->map(fn ($id) => (int) $id)->all();

        $ownedOrgsByUserId = Organization::query()
            ->whereIn('user_id', $userIds)
            ->with(['user:id,slug'])
            ->get()
            ->keyBy(fn (Organization $o) => (int) $o->user_id);

        $followers->getCollection()->transform(function (UserFavoriteOrganization $follower) use ($ownedOrgsByUserId) {
            $user = $follower->user;
            if ($user === null) {
                $follower->setAttribute('follower_display_name', 'Unknown');
                $follower->setAttribute('follower_avatar', null);
                $follower->setAttribute('is_organization_follower', false);

                return $follower;
            }

            $role = (string) ($user->role ?? '');
            $isOrgAccount = in_array($role, ['organization', 'organization_pending'], true);
            $org = $ownedOrgsByUserId->get((int) $user->id) ?? $user->organization;

            $displayName = (string) $user->name;
            $avatar = $user->image;
            if ($isOrgAccount && $org !== null) {
                $displayName = (string) $org->name;
                if (! empty($org->registered_user_image)) {
                    $avatar = $org->registered_user_image;
                }
            }

            $follower->setAttribute('follower_display_name', $displayName);
            $follower->setAttribute('follower_avatar', $avatar);
            $follower->setAttribute('is_organization_follower', $isOrgAccount && $org !== null);

            return $follower;
        });

        return Inertia::render('organization/Followers/Index', [
            'followers' => $followers,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'ein' => $organization->ein,
            ],
            'filters' => [
                'per_page' => (int) $perPage,
                'page' => (int) $request->input('page', 1),
                'search' => $search,
            ],
            'allowedPerPage' => $allowedPerPage,
        ]);
    }

    public function toggleNotifications(Request $request, $id)
    {
        $user = $request->user();
        $organization = $user->organization;

        if (!$organization) {
            return response()->json(['error' => 'Organization not found'], 404);
        }

        $follower = UserFavoriteOrganization::where('id', $id)
            ->where('organization_id', $organization->id)
            ->firstOrFail();

        $follower->update([
            'notifications' => !$follower->notifications
        ]);

        return response()->json([
            'success' => true,
            'notifications' => $follower->notifications,
            'message' => $follower->notifications
                ? 'Notifications enabled for this follower'
                : 'Notifications disabled for this follower'
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $organization = $user->organization;

        if (!$organization) {
            return response()->json(['error' => 'Organization not found'], 404);
        }

        $follower = UserFavoriteOrganization::where('id', $id)
            ->where('organization_id', $organization->id)
            ->firstOrFail();

        $follower->delete();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Follower removed successfully'
            ]);
        }

        return redirect()->back()->with('success', 'Follower removed successfully');
    }

    // Bulk actions
    public function bulkToggleNotifications(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'status' => 'required|boolean',
        ]);

        $user = $request->user();
        $organization = $user->organization;

        if (!$organization) {
            return response()->json(['error' => 'Organization not found'], 404);
        }

        UserFavoriteOrganization::whereIn('id', $request->ids)
            ->where('organization_id', $organization->id)
            ->update(['notifications' => $request->status]);

        return response()->json([
            'success' => true,
            'message' => $request->status
                ? 'Notifications enabled for selected followers'
                : 'Notifications disabled for selected followers'
        ]);
    }

    public function bulkDestroy(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
        ]);

        $user = $request->user();
        $organization = $user->organization;

        if (!$organization) {
            return response()->json(['error' => 'Organization not found'], 404);
        }

        UserFavoriteOrganization::whereIn('id', $request->ids)
            ->where('organization_id', $organization->id)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Selected followers removed successfully'
        ]);
    }
}
