<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\PrimaryActionCategory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        $primaryActionCategories = [];
        $organizationPrimaryActionCategoryIds = [];

        if ($request->user()?->role === 'organization') {
            $request->user()->load('organization.primaryActionCategories');
            $primaryActionCategories = PrimaryActionCategory::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn ($c) => ['id' => $c->id, 'name' => $c->name])
                ->values()
                ->all();

            if ($request->user()->organization) {
                $organizationPrimaryActionCategoryIds = $request->user()->organization
                    ->primaryActionCategories
                    ->pluck('id')
                    ->values()
                    ->all();
            }
        }

        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
            'primaryActionCategories' => $primaryActionCategories,
            'organizationPrimaryActionCategoryIds' => $organizationPrimaryActionCategoryIds,
        ]);
    }

    /**
     * Update the user's profile settings.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->update([
            'name' => $request->input('name'),
            'email' => $request->input('email'),
            'contact_number' => $request->input('phone'),
            'dob' => $request->input('dob'),
        ]);

        if ($request->user()->role === "organization") {
            $updateData = [
                'contact_name' => $request->input('name'),
                'contact_title' => $request->input('contact_title'),
                'website' => $request->input('website') ?? null,
                'wefunder_project_url' => $request->input('wefunder_project_url') ? trim($request->input('wefunder_project_url')) : null,
                'description' => $request->input('description'),
                'mission' => $request->input('mission'),
                'email' => $request->input('email'),
                'phone' => $request->input('phone') ?? null,
            ];

            // Handle gift card terms approval
            if ($request->has('gift_card_terms_approved')) {
                $updateData['gift_card_terms_approved'] = (bool)$request->input('gift_card_terms_approved');
                if ($updateData['gift_card_terms_approved'] && !$request->user()->organization->gift_card_terms_approved) {
                    $updateData['gift_card_terms_approved_at'] = now();
                }
            }

            $request->user()->organization()->update($updateData);

            // Refresh the organization relationship to ensure updated data is available
            $request->user()->load('organization');

            $pacIds = $request->validated('primary_action_category_ids');
            $request->user()->organization->primaryActionCategories()->sync(
                array_values(array_unique(array_map('intval', $pacIds)))
            );
        }

        return to_route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }


    public function updateSocialAccounts(Request $request)
    {
        $request->validate([
            'social_accounts' => ['required', 'array'],
            'social_accounts.youtube' => ['nullable', 'string', 'url'],
            'social_accounts.facebook' => ['nullable', 'string', 'url'],
            'social_accounts.instagram' => ['nullable', 'string', 'url'],
            'social_accounts.twitter' => ['nullable', 'string', 'url'],
            'social_accounts.linkedin' => ['nullable', 'string', 'url'],
            'social_accounts.tiktok' => ['nullable', 'string', 'url'],
        ]);

        $user = $request->user();
        if ($user->role !== 'organization') {
            abort(403, 'Unauthorized');
        }

        $user->organization()->update([
            'social_accounts' => $request->input('social_accounts'),
        ]);

        return response()->json(['success' => true]);
    }

    /**
     * Update gift card terms approval for organization
     */
    public function updateGiftCardTerms(Request $request): RedirectResponse
    {
        $request->validate([
            'gift_card_terms_approved' => ['required', 'boolean'],
        ]);

        $user = $request->user();

        if ($user->role !== 'organization' || !$user->organization) {
            abort(403, 'Only organizations can update gift card terms.');
        }

        $updateData = [
            'gift_card_terms_approved' => (bool)$request->input('gift_card_terms_approved'),
        ];

        // Set approval timestamp if approving for the first time
        if ($updateData['gift_card_terms_approved'] && !$user->organization->gift_card_terms_approved) {
            $updateData['gift_card_terms_approved_at'] = now();
        }

        $user->organization()->update($updateData);

        // Refresh the organization relationship
        $user->load('organization');

        return redirect()->back()->with('success', 'Gift card terms updated successfully!');
    }
}
