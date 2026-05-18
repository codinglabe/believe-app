<?php

namespace App\Http\Controllers;

use App\Models\GiftOccasion;
use App\Models\SupporterBelievePointGift;
use App\Models\User;
use App\Notifications\SupporterBelievePointGiftReceivedNotification;
use App\Services\FirebaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class SupporterBelievePointGiftController extends Controller
{
    /**
     * Supporters and nonprofit-linked accounts can send Believe Point gifts.
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

    public function showGift(User $recipient)
    {
        $sender = Auth::user();
        if (! $sender instanceof User) {
            return redirect()->guest(route('login'));
        }

        if (! self::isAllowedBirthdayGiftSender($sender)) {
            return redirect()->route('home')->withErrors([
                'error' => 'Gifts are available to supporter and nonprofit accounts.',
            ]);
        }

        if ($recipient->id === $sender->id) {
            return redirect()->back()->withErrors(['error' => 'You cannot send a gift to yourself.']);
        }

        $sender->refresh();

        return Inertia::render('Supporters/BirthdayGift', [
            'recipient' => [
                'id' => $recipient->id,
                'name' => $recipient->name,
                'slug' => $recipient->slug,
                'image' => $recipient->image ? '/storage/'.$recipient->image : null,
            ],
            'senderBalances' => [
                'purchased_believe_points' => round((float) ($sender->believe_points ?? 0), 2),
                'gifted_believe_points' => round((float) ($sender->gifted_believe_points ?? 0), 2),
            ],
            'giftOccasions' => GiftOccasion::query()
                ->orderBy('category')
                ->orderBy('occasion')
                ->get(['id', 'occasion', 'icon', 'category']),
        ]);
    }

    public function showBirthdayGift(User $celebrant)
    {
        return $this->showGift($celebrant);
    }

    public function sendGift(Request $request, User $recipient)
    {
        $sender = Auth::user();
        if (! $sender instanceof User) {
            return redirect()->guest(route('login'));
        }

        if (! self::isAllowedBirthdayGiftSender($sender)) {
            return back()->withErrors([
                'amount' => 'Gifts are available to supporter and nonprofit accounts.',
            ]);
        }

        if ($recipient->id === $sender->id) {
            return back()->withErrors(['amount' => 'You cannot send a gift to yourself.']);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01|max:10000',
            'gift_occasion_id' => 'required|integer|exists:gift_occasions,id',
            'message' => 'nullable|string|max:500',
        ]);

        $amount = round((float) $validated['amount'], 2);
        $message = filled($validated['message'] ?? null) ? trim((string) $validated['message']) : null;
        $occasion = GiftOccasion::query()->findOrFail((int) $validated['gift_occasion_id']);

        [$lockedSender, $lockedRecipient, $gift] = DB::transaction(function () use ($sender, $recipient, $amount, $message, $occasion) {
            /** @var User $lockedSender */
            $lockedSender = User::query()->whereKey($sender->id)->lockForUpdate()->firstOrFail();
            /** @var User $lockedRecipient */
            $lockedRecipient = User::query()->whereKey($recipient->id)->lockForUpdate()->firstOrFail();

            $purchased = round((float) ($lockedSender->believe_points ?? 0), 2);
            if ($purchased < $amount) {
                throw ValidationException::withMessages([
                    'amount' => 'You only have '.$purchased.' Believe Points available.',
                ]);
            }

            $lockedSender->decrement('believe_points', $amount);
            $lockedRecipient->increment('gifted_believe_points', $amount);

            $gift = SupporterBelievePointGift::create([
                'sender_id' => $lockedSender->id,
                'recipient_id' => $lockedRecipient->id,
                'gift_occasion_id' => $occasion->id,
                'amount' => $amount,
                'occasion' => $occasion->occasion,
                'message' => $message,
                'sent_at' => now(),
            ]);

            return [$lockedSender, $lockedRecipient, $gift];
        });

        try {
            $lockedRecipient->notify(new SupporterBelievePointGiftReceivedNotification(
                $lockedSender,
                $gift,
                $amount,
                $message,
                $occasion->occasion,
            ));
        } catch (\Throwable $e) {
            Log::error('Believe Points gift received notification failed', [
                'recipient_id' => $lockedRecipient->id,
                'sender_id' => $lockedSender->id,
                'error' => $e->getMessage(),
            ]);
        }

        try {
            $body = "{$lockedSender->name} sent you a gift for ".rtrim(rtrim(number_format($amount, 2), '0'), '.').' BP.';
            if ($message) {
                $body .= "\nMessage: {$message}";
            }
            $bpUrl = route('believe-points.index', [], true);
            app(FirebaseService::class)->sendToUser($lockedRecipient->id, 'You received a gift', $body, [
                'type' => 'gift_received',
                'sender_id' => (string) $lockedSender->id,
                'gift_id' => (string) $gift->id,
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

    public function sendBirthdayGift(Request $request, User $celebrant)
    {
        return $this->sendGift($request, $celebrant);
    }
}
