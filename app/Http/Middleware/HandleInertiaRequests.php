<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');
        $user = $request->user()?->load("organization");
        $role = $user?->roles?->first();
        $permissions = [];
        if ($role?->permissions) {
            foreach ($role?->permissions as $permission) {
                $permissions[] = $permission->name;
            }
        }
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->contact_number,
                    'role' => $user->role,
                    "image" => $user->image ? '/storage/' . $user->image : null,
                    "cover_img" => $user->cover_img ? '/storage/' . $user->cover_img : null,
                    'joined' => $user->created_at->format('F Y'),
                    "email_verified_at" => $user->email_verified_at,
                    "organization" => $user->organization ? [
                        'contact_title' => $user->organization->contact_title,
                        'website' => $user->organization->website,
                        'description' => $user->organization->description,
                        'mission' => $user->organization->mission,
                        'address' => $user->organization->street . ', ' . $user->organization->city .  ', ' .  $user->organization->state . ', ' .  $user->organization->zip,
                        'joined' => $user->created_at->format('F Y'),
                    ] : null,
                ] : null,
                'permissions' => $permissions
            ],
            'ziggy' => fn(): array => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
            'csrf_token' => csrf_token(),
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'flash' => fn() => $request->session()->get('flash'),
            'success' => fn() => $request->session()->get('success'),
            'error' => fn() => $request->session()->get('error'),
            'info' => fn() => $request->session()->get('info'),
            'warning' => fn() => $request->session()->get('warning'),
        ];
    }
}
