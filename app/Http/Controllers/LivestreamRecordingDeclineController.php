<?php

namespace App\Http\Controllers;

use App\Models\LivestreamRecordingDecline;
use App\Models\OrganizationLivestream;
use App\Models\UserLivestream;
use App\Support\MeetingRecordingPreference;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LivestreamRecordingDeclineController extends Controller
{
    /**
     * Guest declined recording consent — store for host visibility (VDO.Ninja has no API for this).
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'livestream_kind' => 'required|string|in:user,organization',
            'livestream_id' => 'required|integer|min:1',
            'guest_label' => 'nullable|string|max:255',
            'return_to' => ['nullable', 'string', 'max:500', function (string $_a, mixed $value, \Closure $fail): void {
                if ($value === null || $value === '') {
                    return;
                }
                if (! is_string($value) || ! str_starts_with($value, '/') || str_contains($value, '//')) {
                    $fail(__('Invalid redirect.'));
                }
            }],
        ]);

        $kind = $validated['livestream_kind'];
        $id = (int) $validated['livestream_id'];

        if ($kind === 'organization') {
            $livestream = OrganizationLivestream::query()->find($id);
        } else {
            $livestream = UserLivestream::query()->find($id);
        }

        if (! $livestream) {
            return redirect()->back()->with('error', 'Meeting not found.');
        }

        $settings = $livestream->settings ?? [];
        if (! MeetingRecordingPreference::isEnabled(is_array($settings) ? $settings : null, $kind === 'organization')) {
            return redirect()->back()->with('error', 'This meeting is not set to record.');
        }

        LivestreamRecordingDecline::query()->create([
            'livestream_kind' => $kind,
            'livestream_id' => $id,
            'guest_label' => $validated['guest_label'] ? trim((string) $validated['guest_label']) : null,
        ]);

        $msg = __('You chose not to join a recorded meeting. The host has been notified.');
        $returnTo = isset($validated['return_to']) && is_string($validated['return_to']) && $validated['return_to'] !== ''
            ? $validated['return_to']
            : null;

        if ($returnTo !== null) {
            return redirect($returnTo)->with('success', $msg);
        }

        return redirect()->back()->with('success', $msg);
    }
}
