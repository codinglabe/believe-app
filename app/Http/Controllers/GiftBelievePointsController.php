<?php

namespace App\Http\Controllers;

use App\Models\BelievePointGiftInvite;
use App\Models\GiftOccasion;
use App\Models\User;
use App\Services\BelievePointGiftInviteService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;

class GiftBelievePointsController extends Controller
{
    public function __construct(
        private readonly BelievePointGiftInviteService $giftService,
    ) {}

    public function index(Request $request)
    {
        $sender = Auth::user();
        if (! $sender instanceof User) {
            return redirect()->guest(route('login'));
        }

        try {
            $this->giftService->assertCanSend($sender);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return redirect()->route('gift-cards.index')->withErrors([
                'error' => $e->errors()['amount'][0] ?? 'Gifts are not available for this account.',
            ]);
        }

        $sender->refresh();

        $pendingInvites = BelievePointGiftInvite::query()
            ->where('sender_id', $sender->id)
            ->where('status', BelievePointGiftInvite::STATUS_PENDING)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get(['id', 'recipient_email', 'amount', 'occasion', 'expires_at', 'created_at'])
            ->map(fn (BelievePointGiftInvite $invite) => [
                'id' => $invite->id,
                'recipient_email' => $invite->recipient_email,
                'amount' => round((float) $invite->amount, 2),
                'occasion' => $invite->occasion,
                'expires_at' => $invite->expires_at?->toIso8601String(),
                'created_at' => $invite->created_at?->toIso8601String(),
            ]);

        $preselectedRecipient = null;
        $recipientId = (int) $request->query('recipient', 0);
        if ($recipientId > 0 && $recipientId !== (int) $sender->id) {
            $user = User::query()
                ->whereKey($recipientId)
                ->where('role', 'user')
                ->whereNotNull('email_verified_at')
                ->first(['id', 'name', 'email', 'slug', 'image']);
            if ($user) {
                $preselectedRecipient = [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'slug' => $user->slug,
                    'image' => $user->image ? '/storage/'.$user->image : null,
                    'display_name' => $user->name.($user->email ? ' ('.$user->email.')' : ''),
                ];
            }
        }

        return Inertia::render('GiftCards/GiftBp', [
            'senderBalances' => [
                'purchased_believe_points' => round((float) ($sender->believe_points ?? 0), 2),
                'gifted_believe_points' => round((float) ($sender->gifted_believe_points ?? 0), 2),
                'holding_believe_points' => round((float) ($sender->holding_believe_points ?? 0), 2),
            ],
            'giftOccasions' => GiftOccasion::query()
                ->orderBy('category')
                ->orderBy('occasion')
                ->get(['id', 'occasion', 'icon', 'category']),
            'holdDays' => BelievePointGiftInviteService::holdDays(),
            'pendingInvites' => $pendingInvites,
            'preselectedRecipient' => $preselectedRecipient,
            'viewerRole' => $sender->role,
        ]);
    }

    public function search(Request $request)
    {
        $sender = Auth::user();
        if (! $sender instanceof User) {
            return response()->json(['results' => [], 'invite_email' => null], 401);
        }

        $q = trim((string) $request->query('q', ''));
        $results = $this->giftService->searchRecipients($sender, $q);

        $inviteEmail = null;
        if ($results === [] && filter_var($q, FILTER_VALIDATE_EMAIL)) {
            $email = Str::lower($q);
            $exists = User::query()->whereRaw('LOWER(email) = ?', [$email])->exists();
            if (! $exists && Str::lower((string) $sender->email) !== $email) {
                $inviteEmail = $email;
            }
        }

        return response()->json([
            'results' => $results,
            'invite_email' => $inviteEmail,
        ]);
    }

    public function send(Request $request)
    {
        $sender = Auth::user();
        if (! $sender instanceof User) {
            return redirect()->guest(route('login'));
        }

        $validated = $request->validate([
            'mode' => 'required|in:user,invite',
            'recipient_id' => 'exclude_if:mode,invite|required|integer|exists:users,id',
            'email' => 'exclude_if:mode,user|required|email|max:255',
            'amount' => 'required|numeric|min:0.01|max:10000',
            'gift_occasion_id' => 'required|integer|exists:gift_occasions,id',
            'message' => 'nullable|string|max:500',
        ]);

        $occasion = GiftOccasion::query()->findOrFail((int) $validated['gift_occasion_id']);
        $amount = (float) $validated['amount'];
        $message = $validated['message'] ?? null;

        if ($validated['mode'] === 'user') {
            $recipient = User::query()->findOrFail((int) $validated['recipient_id']);
            $this->giftService->sendToExistingUser($sender, $recipient, $amount, $occasion, $message);

            return back()->with('success', 'Your Believe Points gift was sent successfully.');
        }

        $invite = $this->giftService->sendInvite(
            $sender,
            (string) $validated['email'],
            $amount,
            $occasion,
            $message,
        );

        return back()->with(
            'success',
            'Invitation sent to '.$invite->recipient_email.'. '.BelievePointGiftInviteService::formatAmount((float) $invite->amount).' BP is holding until they register ('.BelievePointGiftInviteService::holdDays().' days).'
        );
    }
}
