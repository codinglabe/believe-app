<?php

namespace App\Http\Controllers;

use App\Models\EmailPackage;
use App\Support\EmailPackageCatalog;
use App\Support\EmailPackagePurchaseFulfillment;
use App\Support\StripeCustomerChargeAmount;
use App\Support\UserEmailCredits;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Cashier\Cashier;

class EmailCreditsController extends Controller
{
    /** @var list<string> */
    private const ALLOWED_RETURN_ROUTES = [
        'livestreams.supporter.index',
        'livestreams.supporter.create',
        'livestreams.supporter.show',
        'livestreams.supporter.ready',
        'pay-as-you-go.index',
    ];

    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('frontend/email-credits/Index', [
            'emailStats' => UserEmailCredits::stats($user),
            'emailPackages' => EmailPackageCatalog::activeForCheckout(),
            'stripeMinCheckoutUsd' => EmailPackageCatalog::stripeMinCheckoutUsd(),
            'returnRoute' => $this->sanitizeReturnRoute($request->input('return_route')),
            'returnId' => $this->sanitizeReturnId($request->input('return_id')),
        ]);
    }

    public function purchase(Request $request): RedirectResponse|\Symfony\Component\HttpFoundation\Response
    {
        $request->validate([
            'package_id' => 'required|exists:email_packages,id',
            'return_route' => 'nullable|string|max:100',
            'return_id' => 'nullable|integer|min:1',
        ]);

        $user = $request->user();
        $package = EmailPackage::active()->findOrFail($request->input('package_id'));
        $returnRoute = $this->sanitizeReturnRoute($request->input('return_route'));
        $returnId = $this->sanitizeReturnId($request->input('return_id'));

        if (! StripeCustomerChargeAmount::meetsCheckoutMinimum((float) $package->price)) {
            $message = 'This pack is below Stripe\'s $'.number_format(StripeCustomerChargeAmount::MIN_CHECKOUT_CENTS / 100, 2).' minimum charge. Choose a larger pack.';

            if ($request->expectsJson()) {
                return response()->json(['message' => $message], 422);
            }

            return back()->withErrors(['message' => $message]);
        }

        try {
            $transaction = $user->recordTransaction([
                'type' => 'email_purchase',
                'amount' => $package->price,
                'payment_method' => 'stripe',
                'status' => 'pending',
                'meta' => [
                    'type' => 'email_purchase',
                    'emails_to_add' => $package->emails_count,
                    'package_id' => $package->id,
                    'package_name' => $package->name,
                    'description' => "Purchase {$package->name}",
                ],
            ]);

            $amountInCents = StripeCustomerChargeAmount::chargeCentsFromNetUsd((float) $package->price, 'card');

            $successQs = 'session_id={CHECKOUT_SESSION_ID}&'.http_build_query(array_filter([
                'return_route' => $returnRoute,
                'return_id' => $returnId,
            ], static fn ($value) => $value !== null && $value !== ''));

            $cancelQs = http_build_query(array_filter([
                'canceled' => '1',
                'return_route' => $returnRoute,
                'return_id' => $returnId,
            ], static fn ($value) => $value !== null && $value !== ''));

            $checkout = $user->checkoutCharge(
                $amountInCents,
                $package->name,
                1,
                [
                    'success_url' => route('email-credits.purchase.success').'?'.$successQs,
                    'cancel_url' => route('email-credits.index').'?'.$cancelQs,
                    'metadata' => EmailPackagePurchaseFulfillment::checkoutMetadata(
                        $user,
                        $transaction,
                        (int) $package->emails_count,
                        (int) $package->id,
                        (float) $package->price,
                        [
                            'return_to' => 'email-credits',
                            'return_route' => $returnRoute,
                            'return_id' => $returnId !== null ? (string) $returnId : '',
                        ]
                    ),
                    'payment_method_types' => ['card'],
                ]
            );

            if ($request->expectsJson()) {
                return response()->json(['redirect' => $checkout->url]);
            }

            return Inertia::location($checkout->url);
        } catch (\Exception $e) {
            Log::error('Email credits purchase checkout error', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
            ]);

            $message = 'Failed to create checkout session. Please try again.';

            if ($request->expectsJson()) {
                return response()->json(['message' => $message], 500);
            }

            return back()->withErrors([
                'message' => $message,
            ]);
        }
    }

    public function purchaseSuccess(Request $request): RedirectResponse
    {
        $returnRoute = $this->sanitizeReturnRoute($request->query('return_route'));
        $returnId = $this->sanitizeReturnId($request->query('return_id'));

        try {
            $sessionId = $request->query('session_id');

            if (! $sessionId) {
                return $this->redirectAfterPurchase($returnRoute, $returnId, null, 'Invalid session ID.');
            }

            $user = $request->user();
            $session = Cashier::stripe()->checkout->sessions->retrieve($sessionId);

            if ($session->payment_status !== 'paid') {
                return $this->redirectAfterPurchase($returnRoute, $returnId, null, 'Payment was not completed.');
            }

            $result = EmailPackagePurchaseFulfillment::fulfill($user, $session, (string) $sessionId);
            $emailsToAdd = $result['emails_added'];

            if ($emailsToAdd <= 0) {
                return $this->redirectAfterPurchase(
                    $returnRoute,
                    $returnId,
                    null,
                    'Payment received but email credits could not be applied. Please contact support with your receipt.'
                );
            }

            $successMsg = $result['already_fulfilled']
                ? "Your {$emailsToAdd} email credit(s) were already added to your balance."
                : "Successfully purchased {$emailsToAdd} email credit(s)!";

            return $this->redirectAfterPurchase($returnRoute, $returnId, $successMsg, null);
        } catch (\Exception $e) {
            Log::error('Email credits purchase success handler error', [
                'error' => $e->getMessage(),
                'session_id' => $request->query('session_id'),
            ]);

            return $this->redirectAfterPurchase(
                $returnRoute,
                $returnId,
                null,
                'Error processing payment. Please contact support.'
            );
        }
    }

    private function sanitizeReturnRoute(mixed $routeName): string
    {
        if (! is_string($routeName) || $routeName === '' || ! Route::has($routeName)) {
            return 'livestreams.supporter.index';
        }

        if (! in_array($routeName, self::ALLOWED_RETURN_ROUTES, true)) {
            return 'livestreams.supporter.index';
        }

        return $routeName;
    }

    private function sanitizeReturnId(mixed $id): ?int
    {
        if ($id === null || $id === '') {
            return null;
        }

        $parsed = (int) $id;

        return $parsed > 0 ? $parsed : null;
    }

    private function redirectAfterPurchase(
        string $returnRoute,
        ?int $returnId,
        ?string $success,
        ?string $error
    ): RedirectResponse {
        if (in_array($returnRoute, ['livestreams.supporter.show', 'livestreams.supporter.ready'], true)) {
            if ($returnId === null) {
                $redirect = redirect()->route('livestreams.supporter.index');
            } else {
                $redirect = redirect()->route($returnRoute, $returnId);
            }
        } else {
            $redirect = redirect()->route($returnRoute);
        }

        if ($success !== null && $success !== '') {
            return $redirect->with('success', $success);
        }

        if ($error !== null && $error !== '') {
            return $redirect->with('error', $error);
        }

        return $redirect;
    }
}
