<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCareAllianceWalletEligible
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! $user->careAllianceWalletEligible()) {
            if ($request->expectsJson() || $request->wantsJson() || $request->header('Accept') === 'application/json') {
                return response()->json([
                    'success' => false,
                    'message' => 'Add a valid 9-digit EIN to your Care Alliance settings to use the wallet.',
                ], 403);
            }

            return redirect()->back()->with(
                'error',
                'Add a valid 9-digit EIN to your Care Alliance settings to use the wallet.'
            );
        }

        return $next($request);
    }
}
