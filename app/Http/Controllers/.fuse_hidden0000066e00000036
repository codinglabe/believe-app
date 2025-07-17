<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\UserFavoriteOrganization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

class UserProfileController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        // Get recent donations (you'll need to adjust based on your donation model)
        $recentDonations = collect([]); // Replace with actual donation query

        return Inertia::render('frontend/user-profile/index', [
            'recentDonations' => $recentDonations,
        ]);
    }

    public function edit()
    {
        return Inertia::render('frontend/user-profile/edit');
    }


    public function update(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email,' . $request->user()->id],
            'phone' => ['nullable', 'string', 'max:20'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif', 'max:2048'],
        ]);

        // If email is changed, reset email verification
        if ($request->user()->email !== $validated['email']) {
            $validated['email_verified_at'] = null;

            $request->user()->sendEmailVerificationNotification();
        }



        // Handle image upload
        if ($request->hasFile('image')) {
            // Delete old image
            if ($request->user()->image) {
                Storage::disk('public')->delete($request->user()->image);
            }

            $filename = 'profile-' . $request->user()->id . '-' . time() . '.' . $request->file('image')->getClientOriginalExtension();
            $path = $request->file('image')->storeAs('profile-photos', $filename, 'public');

            $validated['image'] = $path;

            $request->user()->update([
                "image" => $validated['image'],
            ]);
        }

        $request->user()->update([
            "name" => $validated['name'],
            "email" => $validated['email'],
            "contact_number" => $validated['phone'] ?? null,
        ]);


        return to_route('user.profile.edit');
    }



    public function changePasswordForm()
    {
        return Inertia::render('frontend/user-profile/change-password');
    }

    public function favorites(Request $request)
    {
        $user = $request->user();

        // Eager-load donations sum for this user on each favorite org
        $favoriteOrganizations = $user->favoriteOrganizations()
            ->withSum(['donations as total_donated' => function ($query) use ($user) {
                $query->where('user_id', $user->id)
                ->where('status', 'completed');
            }], 'amount')
            ->get();

        return Inertia::render('frontend/user-profile/favorites', [
            'favoriteOrganizations' => $favoriteOrganizations,
        ]);
    }

    public function donations()
    {
        // Get user's donation history
        $donations = collect([]); // Replace with actual query

        return Inertia::render('frontend/user-profile/donations', [
            'donations' => $donations,
        ]);
    }

    public function orders()
    {
        // Get user's order history
        $orders = collect([]); // Replace with actual query

        return Inertia::render('frontend/user-profile/orders', [
            'orders' => $orders,
        ]);
    }


    public function removeFavorite(int $id)
    {
        $user = Auth::user();
        $favorite = UserFavoriteOrganization::where('user_id', $user->id)->where('organization_id', $id)->first();

        if ($favorite) {
            $favorite->delete();
        }

        return redirect()->route('user.profile.favorites');
    }
}
