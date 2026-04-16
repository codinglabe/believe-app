<?php

namespace App\Http\Controllers;

use App\Models\SupporterBelievePointGift;
use App\Models\User;
use App\Models\UserFollow;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SupporterBelievePointGiftController extends Controller
{
    public function showBirthdayGift(User $celebrant)
    {
        $sender = Auth::user();
        if (! $sender || $sender->role !== 'user') {
            return redirect()->route('login');
        }

        if ($celebrant->id === $sender->id) {
            return redirect()->back()->withErrors(['error' => 'You cannot send a gift to yourself.']);
        }

        $isFollowing = UserFollow::query()
            ->where('follower_id', $sender->id)
            ->where('following_id', $celebrant->id)
            ->exists();

        if (! $isFollowing) {
            return redirect()->route('find-supporters.index')->withErrors([
                'error' => 'You can only send a birthday gift to supporters you follow.',
            ]);
        }

        $sender->refresh();

        return Inertia::render('Supporters/BirthdayGift', [
            'celebrant' => [
                'id' => $celebrant->id,
                'name' => $celebrant->name,
                'slug' => $celebrant->slug,
                'image' => $celebrant->image ? '/storage/'.$celebrant->image : null,
            ],
            'senderBalances' => [
                'purchased_believe_points' => round((float) ($sender->believe_points ?? 0), 2),
                'gifted_believe_points' => round((float) ($sender->gifted_believe_points ?? 0), 2),
            ],
        ]);
    }

    public function sendBirthdayGift(Request $request, User $celebrant)
    {
        $sender = Auth::user();
        if (! $sender || $sender->role !== 'user') {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        if ($celebrant->id === $sender->id) {
            return back()->withErrors(['amount' => 'You cannot send a gift to yourself.']);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01|max:10000',
            'message' => 'nullable|string|max:500',
        ]);

        $isFollowing = UserFollow::query()
            ->where('follower_id', $sender->id)
            ->where('following_id', $celebrant->id)
            ->exists();

        if (! $isFollowing) {
            return back()->withErrors(['amount' => 'You can only send gifts to supporters you follow.']);
        }

        $amount = round((float) $validated['amount'], 2);

        DB::beginTransaction();
        try {
            /** @var User $lockedSender */
            $lockedSender = User::query()->whereKey($sender->id)->lockForUpdate()->firstOrFail();
            $lockedRecipient = User::query()->whereKey($celebrant->id)->lockForUpdate()->firstOrFail();

            $purchased = round((float) ($lockedSender->believe_points ?? 0), 2);
            if ($purchased < $amount) {
                DB::rollBack();

                return back()->withErrors([
                    'amount' => 'You only have '.$purchased.' purchased Believe Points. Gifted points cannot be re-sent to other supporters.',
                ]);
            }

            $lockedSender->decrement('believe_points', $amount);
            $lockedRecipient->increment('gifted_believe_points', $amount);

            SupporterBelievePointGift::create([
                'sender_id' => $lockedSender->id,
                'recipient_id' => $lockedRecipient->id,
                'amount' => $amount,
                'occasion' => 'birthday',
                'message' => $validated['message'] ?? null,
            ]);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return redirect()->route('find-supporters.index')->with('success', 'Your Believe Points gift was sent successfully.');
    }
}
