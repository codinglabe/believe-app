<?php

namespace App\Http\Controllers;

use App\Models\SupporterBelievePointGift;
use App\Models\User;
use App\Notifications\SupporterBelievePointGiftReceivedNotification;
use App\Services\FirebaseService;
use App\Support\SupporterBirthdayGiftPolicy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class SupporterBelievePointGiftController extends Controller
{
    /**
     * Supporters and nonprofit-linked accounts can send birthday gifts when {@see SupporterBirthdayGiftPolicy} allows.
     *
     * @return list<string>
     */
    private static function birthdayGiftSenderRoles(): array
    {
        return ['user', 'organization', 'organization_pending', 'care_alliance'];
    }

    private static function isAllowedBirthdayGiftSender(?User $sender): bool
    {
        return $sender && in_array($sender->role, self::birthdayGiftSenderRoles(), true);
    }

    public function showBirthdayGift(User $celebrant)
    {
        $sender = Auth::user();
        if (! $sender instanceof User) {
            return redirect()->guest(route('login'));
        }

        if (! self::isAllowedBirthdayGiftSender($sender)) {
            return redirect()->route('home')->withErrors([
                'error' => 'Birthday gifts are available to supporter and nonprofit accounts.',
            ]);
        }

        if ($celebrant->id === $sender->id) {
            return redirect()->back()->withErrors(['error' => 'You cannot send a gift to yourself.']);
        }

        if (! SupporterBirthdayGiftPolicy::maySendGift($sender, $celebrant)) {
            return redirect()->route('find-supporters.index')->withErrors([
                'error' => 'You can send a birthday gift if you follow this supporter, if you follow the same nonprofit they follow, or if you manage a nonprofit they follow.',
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
        if (! $sender instanceof User) {
            return redirect()->guest(route('login'));
        }

        if (! self::isAllowedBirthdayGiftSender($sender)) {
            return back()->withErrors([
                'amount' => 'Birthday gifts are available to supporter and nonprofit accounts.',
            ]);
        }

        if ($celebrant->id === $sender->id) {
            return back()->withErrors(['amount' => 'You cannot send a gift to yourself.']);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01|max:10000',
            'message' => 'nullable|string|max:500',
        ]);

        if (! SupporterBirthdayGiftPolicy::maySendGift($sender, $celebrant)) {
            return back()->withErrors([
                'amount' => 'You can send a gift if you follow this supporter, if you follow the same nonprofit they follow, or if you manage a nonprofit they follow.',
            ]);
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

        try {
            $lockedRecipient->notify(new SupporterBelievePointGiftReceivedNotification(
                $lockedSender,
                $amount,
                $validated['message'] ?? null,
                'birthday',
            ));
        } catch (\Throwable $e) {
            Log::error('Believe Points gift received notification failed', [
                'recipient_id' => $lockedRecipient->id,
                'sender_id' => $lockedSender->id,
                'error' => $e->getMessage(),
            ]);
        }

        try {
            $first = explode(' ', trim($lockedSender->name ?? 'Someone'))[0];
            $bpUrl = route('believe-points.index', [], true);
            app(FirebaseService::class)->sendToUser($lockedRecipient->id, 'You received Believe Points', "{$first} sent you ".number_format($amount, 2).' Believe Points.', [
                'type' => 'believe_points_gift_received',
                'sender_id' => (string) $lockedSender->id,
                'click_action' => $bpUrl,
                'url' => $bpUrl,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Believe Points gift FCM push failed', [
                'recipient_id' => $lockedRecipient->id,
                'error' => $e->getMessage(),
            ]);
        }

        return redirect()->route('find-supporters.index')->with('success', 'Your Believe Points gift was sent successfully.');
    }
}
