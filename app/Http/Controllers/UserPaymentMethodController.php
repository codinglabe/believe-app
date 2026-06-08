<?php

namespace App\Http\Controllers;

use App\Services\UserStripePaymentMethodService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Stripe\Exception\ApiErrorException;

class UserPaymentMethodController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();
        abort_unless($user, 403);

        $layout = $request->routeIs('settings.saved-payment-methods.*') ? 'settings' : 'profile';

        return Inertia::render('account/payment-methods', [
            'layout' => $layout,
            'paymentMethods' => UserStripePaymentMethodService::listForUser($user),
            'returnUrl' => $request->query('return'),
        ]);
    }

    public function setup(Request $request): RedirectResponse|\Symfony\Component\HttpFoundation\Response
    {
        $user = Auth::user();
        abort_unless($user, 403);

        $validated = $request->validate([
            'instrument' => ['required', 'in:card,bank'],
            'return' => ['nullable', 'string', 'max:2048'],
        ]);

        $return = $validated['return'] ?? null;
        // Stripe replaces the literal {CHECKOUT_SESSION_ID} token — must not be URL-encoded via http_build_query.
        $successUrl = route('account.payment-methods.setup-success').'?session_id={CHECKOUT_SESSION_ID}';
        if (is_string($return) && $return !== '' && str_starts_with($return, '/')) {
            $successUrl .= '&return='.rawurlencode($return);
        }
        $cancelUrl = $return && str_starts_with($return, '/')
            ? url($return)
            : route($this->indexRouteForUser($user));

        try {
            $session = UserStripePaymentMethodService::createSetupCheckoutSession(
                $user,
                $validated['instrument'],
                $successUrl,
                $cancelUrl,
            );

            return Inertia::location($session->url);
        } catch (ApiErrorException $e) {
            Log::error('Payment method setup Stripe error', [
                'user_id' => $user->id,
                'message' => $e->getMessage(),
            ]);

            return redirect()->back()->with('error', 'Could not start payment method setup. Please try again.');
        } catch (\Throwable $e) {
            Log::error('Payment method setup error', [
                'user_id' => $user->id,
                'message' => $e->getMessage(),
            ]);

            return redirect()->back()->with('error', 'Could not start payment method setup. Please try again.');
        }
    }

    public function setupSuccess(Request $request): RedirectResponse
    {
        $user = Auth::user();
        abort_unless($user, 403);

        $sessionId = $request->query('session_id');
        if (! $sessionId) {
            return redirect()->to($this->redirectAfterSetup($request))
                ->with('error', 'Invalid setup session.');
        }

        try {
            UserStripePaymentMethodService::completeSetupFromCheckoutSession($user, (string) $sessionId);

            return redirect()->to($this->redirectAfterSetup($request))
                ->with('success', 'Payment method saved successfully.');
        } catch (\Throwable $e) {
            Log::error('Payment method setup success error', [
                'user_id' => $user->id,
                'message' => $e->getMessage(),
            ]);

            return redirect()->to($this->redirectAfterSetup($request))
                ->with('error', 'Could not save your payment method. Please try again.');
        }
    }

    public function setDefault(Request $request, string $paymentMethodId): RedirectResponse
    {
        $user = Auth::user();
        abort_unless($user, 403);

        if (! UserStripePaymentMethodService::paymentMethodBelongsToUser($user, $paymentMethodId)) {
            return redirect()->back()->with('error', 'Payment method not found.');
        }

        try {
            UserStripePaymentMethodService::setDefault($user, $paymentMethodId);

            return redirect()->back()->with('success', 'Default payment method updated.');
        } catch (\Throwable $e) {
            Log::error('Set default payment method error', [
                'user_id' => $user->id,
                'payment_method' => $paymentMethodId,
                'message' => $e->getMessage(),
            ]);

            return redirect()->back()->with('error', 'Could not update default payment method.');
        }
    }

    public function destroy(Request $request, string $paymentMethodId): RedirectResponse
    {
        $user = Auth::user();
        abort_unless($user, 403);

        if (! UserStripePaymentMethodService::paymentMethodBelongsToUser($user, $paymentMethodId)) {
            return redirect()->back()->with('error', 'Payment method not found.');
        }

        try {
            UserStripePaymentMethodService::detach($user, $paymentMethodId);

            return redirect()->back()->with('success', 'Payment method removed.');
        } catch (\Throwable $e) {
            Log::error('Remove payment method error', [
                'user_id' => $user->id,
                'payment_method' => $paymentMethodId,
                'message' => $e->getMessage(),
            ]);

            return redirect()->back()->with('error', 'Could not remove payment method.');
        }
    }

    private function redirectAfterSetup(Request $request): string
    {
        $return = $request->query('return');
        if (is_string($return) && $return !== '' && str_starts_with($return, '/')) {
            return url($return);
        }

        $user = Auth::user();

        return route($this->indexRouteForUser($user));
    }

    private function indexRouteForUser($user): string
    {
        if ($user && ! $user->hasNonprofitDashboardRole()) {
            return 'user.profile.payment-methods.index';
        }

        return 'settings.saved-payment-methods.index';
    }
}
