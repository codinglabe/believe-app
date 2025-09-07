<?php

use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\IncreaseUploadLimits;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->encryptCookies(except: [
            'appearance',
            'sidebar_state'
        ]);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            IncreaseUploadLimits::class,
        ]);

        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'topics.selected' => \App\Http\Middleware\CheckTopicsSelected::class,
            'check.permission' => \App\Http\Middleware\CheckPermission::class,
            'check.role' => \App\Http\Middleware\CheckRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\HttpException $e, $request) {
            if ($e->getStatusCode() === 403) {
                // If it's an AJAX request, return JSON response
                if ($request->expectsJson()) {
                    return response()->json([
                        'message' => $e->getMessage(),
                        'status' => 403
                    ], 403);
                }

                // For web requests, show custom permission denied page
                return \Inertia\Inertia::render('errors/permission-denied', [
                    'permission' => 'access_denied',
                    'userRole' => $request->user()?->getRoleNames()->first(),
                    'requiredPermission' => 'access_denied',
                    'backUrl' => $request->header('referer') ?: route('dashboard'),
                    'errorMessage' => $e->getMessage()
                ])->toResponse($request)->setStatusCode(403);
            }
        });
    })
    ->create();
