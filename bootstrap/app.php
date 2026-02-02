<?php

use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\IncreaseUploadLimits;
use App\Http\Middleware\NoCacheAuthPages;
use App\Http\Middleware\DetectTimezone;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Webhooks are called by external services and cannot include Laravel CSRF tokens.
        // Security is handled in the webhook controller via signature verification.
        $middleware->validateCsrfTokens(except: [
            'webhooks/bridge',
            'api/*', // Exclude all API routes from CSRF protection
        ]);

        $middleware->encryptCookies(except: [
            'appearance',
            'sidebar_state'
        ]);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            IncreaseUploadLimits::class,
            NoCacheAuthPages::class, // Prevent caching of login/register to avoid 419 CSRF
            DetectTimezone::class, // Sets timezone for entire application
        ]);

        // Also apply timezone detection to API routes
        $middleware->api(append: [
            DetectTimezone::class,
        ]);

        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'role.simple' => \App\Http\Middleware\CheckRoleSimple::class, // Simple role check without guard issues
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'topics.selected' => \App\Http\Middleware\CheckTopicsSelected::class,
            'check.permission' => \App\Http\Middleware\CheckPermission::class,
            'check.role' => \App\Http\Middleware\CheckRole::class,
            'EnsureEmailIsVerified' => \App\Http\Middleware\EnsureEmailIsVerified::class,
            'api.email.verified' => \App\Http\Middleware\EnsureApiEmailVerified::class, // Secure API email verification guard
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\HttpException $e, $request) {
            if ($e->getStatusCode() === 404) {
                // If it's an AJAX request, return JSON response
                if ($request->expectsJson()) {
                    return response()->json([
                        'message' => 'The requested resource was not found.',
                        'status' => 404
                    ], 404);
                }

                // For web requests, show custom 404 page
                $user = $request->user();
                $backUrl = $request->header('referer');

                if (!$backUrl && $user) {
                    $userRole = $user->role ?? null;
                    if ($userRole === 'admin' || $userRole === 'organization' || $userRole === 'organization_pending') {
                        $backUrl = route('dashboard');
                    } elseif ($userRole === 'merchant') {
                        $backUrl = route('merchant.dashboard');
                    } elseif ($userRole === 'user') {
                        $backUrl = route('user.profile.index');
                    } else {
                        $backUrl = '/';
                    }
                } elseif (!$backUrl) {
                    $backUrl = '/';
                }

                return \Inertia\Inertia::render('errors/404', [
                    'backUrl' => $backUrl,
                    'errorMessage' => $e->getMessage() ?: 'Page not found',
                    'auth' => [
                        'user' => $user ? [
                            'id' => $user->id,
                            'role' => $user->role ?? null,
                        ] : null,
                    ]
                ])->toResponse($request)->setStatusCode(404);
            }

            if ($e->getStatusCode() === 403) {
                // If it's an AJAX request, return JSON response
                if ($request->expectsJson()) {
                    return response()->json([
                        'message' => $e->getMessage(),
                        'status' => 403
                    ], 403);
                }

                // For web requests, show custom permission denied page
                $user = $request->user();
                $userRoles = [];
                $userPermissions = [];

                if ($user && method_exists($user, 'getRoleNames')) {
                    try {
                        $userRoles = $user->getRoleNames()->toArray();
                    } catch (\Exception $ex) {
                        // If getRoleNames fails, try to get role from user property
                        $userRoles = $user->role ? [$user->role] : [];
                    }
                } elseif ($user && property_exists($user, 'role') && $user->role) {
                    $userRoles = [$user->role];
                }

                if ($user && method_exists($user, 'getAllPermissions')) {
                    try {
                        $userPermissions = $user->getAllPermissions()->pluck('name')->toArray();
                    } catch (\Exception $ex) {
                        $userPermissions = [];
                    }
                }

                // Try to extract required permission/role from error message
                $requiredPermission = null;
                $requiredRoles = [];
                $errorMessage = $e->getMessage();

                // Extract permission from error message if it contains "Required permission:"
                if (preg_match('/Required permission:\s*([^\s]+)/i', $errorMessage, $matches)) {
                    $requiredPermission = $matches[1];
                }

                // Extract roles from error message if it contains "Required role(s):"
                if (preg_match('/Required role[s]?:\s*([^\.]+)/i', $errorMessage, $matches)) {
                    $rolesString = trim($matches[1]);
                    $requiredRoles = array_map('trim', explode(',', $rolesString));
                }

                // Get role-specific back URL
                $backUrl = $request->header('referer');
                if (!$backUrl && $user) {
                    $userRole = $userRoles[0] ?? $user->role ?? null;
                    if ($userRole === 'admin' || $userRole === 'organization' || $userRole === 'organization_pending') {
                        $backUrl = route('dashboard');
                    } elseif ($userRole === 'merchant') {
                        $backUrl = route('merchant.dashboard');
                    } elseif ($userRole === 'user') {
                        $backUrl = route('user.profile.index');
                    } else {
                        $backUrl = '/';
                    }
                } elseif (!$backUrl) {
                    $backUrl = '/';
                }

                return \Inertia\Inertia::render('errors/permission-denied', [
                    'permission' => 'access_denied',
                    'userRole' => $userRoles[0] ?? ($user->role ?? null),
                    'userRoles' => $userRoles,
                    'userPermissions' => $userPermissions,
                    'requiredPermission' => $requiredPermission ?: 'access_denied',
                    'requiredRoles' => !empty($requiredRoles) ? $requiredRoles : null,
                    'backUrl' => $backUrl,
                    'errorMessage' => $errorMessage,
                    'auth' => [
                        'user' => $user ? [
                            'id' => $user->id,
                            'role' => $user->role ?? null,
                        ] : null,
                        'roles' => $userRoles,
                        'permissions' => $userPermissions,
                    ]
                ])->toResponse($request)->setStatusCode(403);
            }
        });
    })
    ->create();
