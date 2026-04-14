<?php

namespace App\Http\Controllers;

use App\Models\PrimaryActionCategory;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class VolunteerSupporterInterestsController extends BaseController
{
    /**
     * Supporters (role user) who shared what they want to volunteer for — visible to orgs with volunteer.read.
     */
    public function index(Request $request)
    {
        $this->authorizePermission($request, 'volunteer.read');

        $perPage = min(max((int) $request->get('per_page', 12), 5), 50);
        $page = max((int) $request->get('page', 1), 1);
        $search = trim((string) $request->get('search', ''));

        $query = User::query()
            ->select([
                'id',
                'name',
                'slug',
                'city',
                'state',
                'registered_user_image',
                'volunteer_interest_statement',
                'updated_at',
            ])
            ->where('role', 'user')
            ->whereNotNull('volunteer_interest_statement')
            ->where('volunteer_interest_statement', '!=', '')
            ->with(['supporterInterestCategories' => function ($q) {
                // Pivot table has its own `id` — unqualified `id` is ambiguous in MySQL.
                $t = (new PrimaryActionCategory)->getTable();
                $q->select("{$t}.id", "{$t}.name")->orderBy("{$t}.name");
            }]);

        if ($search !== '') {
            $like = '%'.$search.'%';
            $query->where(function ($q) use ($like) {
                $q->where('name', 'like', $like)
                    ->orWhere('volunteer_interest_statement', 'like', $like)
                    ->orWhere('city', 'like', $like)
                    ->orWhere('state', 'like', $like);
            });
        }

        $supporters = $query
            ->orderByDesc('updated_at')
            ->paginate($perPage, ['*'], 'page', $page)
            ->withQueryString();

        $supporters->getCollection()->transform(function (User $user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'slug' => $user->slug,
                'city' => $user->city,
                'state' => $user->state,
                'image' => $user->registered_user_image,
                'volunteer_interest_statement' => $user->volunteer_interest_statement,
                'updated_at' => $user->updated_at?->toIso8601String(),
                'causes' => $user->supporterInterestCategories->map(fn ($c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                ])->values()->all(),
            ];
        });

        return Inertia::render('volunteers/supporter-interests', [
            'supporters' => $supporters,
            'filters' => [
                'per_page' => $perPage,
                'page' => $page,
                'search' => $search,
            ],
            'allowedPerPage' => [6, 12, 24, 48],
        ]);
    }
}
