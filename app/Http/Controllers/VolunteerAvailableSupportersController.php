<?php

namespace App\Http\Controllers;

use App\Models\JobPosition;
use App\Models\PrimaryActionCategory;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class VolunteerAvailableSupportersController extends BaseController
{
    /**
     * Rich “Available Supporters” view for orgs: supporters who have saved profile cause
     * interests (`primary_action_category_user`), and/or at least one preferred job position
     * (`user_volunteer_job_positions`), and/or a non-empty volunteer interest statement.
     * Permission: volunteer.read.
     */
    public function index(Request $request)
    {
        $this->authorizePermission($request, 'volunteer.read');

        $perPage = min(max((int) $request->get('per_page', 12), 6), 48);
        $page = max((int) $request->get('page', 1), 1);
        $search = trim((string) $request->get('search', ''));
        $city = trim((string) $request->get('city', ''));
        $state = trim((string) $request->get('state', ''));
        $skills = trim((string) $request->get('skills', ''));
        $positionId = (int) $request->get('position_id', 0);
        $sort = in_array($request->get('sort'), ['recently_joined', 'recently_active', 'name_asc'], true)
            ? $request->get('sort')
            : 'recently_joined';

        $t = (new User)->getTable();
        $query = User::query()
            ->select([
                $t.'.id',
                $t.'.name',
                $t.'.email',
                $t.'.slug',
                $t.'.city',
                $t.'.state',
                $t.'.registered_user_image',
                $t.'.volunteer_interest_statement',
                $t.'.created_at',
                $t.'.updated_at',
            ])
            ->where($t.'.role', 'user')
            ->where(function ($q) use ($t) {
                $q
                    // Profile “Supporters interest” — primary action / cause categories
                    ->whereIn($t.'.id', function ($sub) {
                        $sub->select('user_id')
                            ->from('primary_action_category_user');
                    })
                    // Volunteer page: saved job role types
                    ->orWhereIn($t.'.id', function ($sub) {
                        $sub->select('user_id')
                            ->from('user_volunteer_job_positions');
                    })
                    ->orWhere(function ($q2) use ($t) {
                        $q2->whereNotNull($t.'.volunteer_interest_statement')
                            ->where($t.'.volunteer_interest_statement', '!=', '');
                    });
            })
            ->with([
                'supporterInterestCategories' => function ($q) {
                    $t = (new PrimaryActionCategory)->getTable();
                    $q->select("{$t}.id", "{$t}.name")->orderBy("{$t}.name");
                },
                'volunteerPreferredJobPositions' => function ($q) {
                    $j = (new JobPosition)->getTable();
                    $q->select("{$j}.id", "{$j}.title")->orderBy("{$j}.title");
                },
            ]);

        if ($search !== '') {
            $like = '%'.addcslashes($search, '%_\\').'%';
            $j = (new JobPosition)->getTable();
            $pac = (new PrimaryActionCategory)->getTable();
            $query->where(function ($q) use ($like, $t, $j, $pac) {
                $q->where($t.'.name', 'like', $like)
                    ->orWhere($t.'.email', 'like', $like)
                    ->orWhere($t.'.volunteer_interest_statement', 'like', $like)
                    ->orWhere($t.'.city', 'like', $like)
                    ->orWhere($t.'.state', 'like', $like)
                    ->orWhereHas('volunteerPreferredJobPositions', function ($q2) use ($like, $j) {
                        $q2->where("{$j}.title", 'like', $like);
                    })
                    ->orWhereHas('supporterInterestCategories', function ($q2) use ($like, $pac) {
                        $q2->where("{$pac}.name", 'like', $like);
                    });
            });
        }

        if ($city !== '') {
            $query->where($t.'.city', 'like', '%'.addcslashes($city, '%_\\').'%');
        }
        if ($state !== '') {
            $query->where($t.'.state', 'like', '%'.addcslashes($state, '%_\\').'%');
        }
        if ($skills !== '') {
            $like = '%'.addcslashes($skills, '%_\\').'%';
            $j = (new JobPosition)->getTable();
            $pac = (new PrimaryActionCategory)->getTable();
            $query->where(function ($q) use ($like, $t, $j, $pac) {
                $q->where($t.'.volunteer_interest_statement', 'like', $like)
                    ->orWhereHas('volunteerPreferredJobPositions', function ($q2) use ($like, $j) {
                        $q2->where("{$j}.title", 'like', $like);
                    })
                    ->orWhereHas('supporterInterestCategories', function ($q2) use ($like, $pac) {
                        $q2->where("{$pac}.name", 'like', $like);
                    });
            });
        }
        if ($positionId > 0) {
            $query->whereHas('volunteerPreferredJobPositions', function ($q) use ($positionId) {
                $q->where('job_positions.id', $positionId);
            });
        }

        $stats = $this->buildStats((clone $query), $t);

        $lastPage = max(1, (int) ceil($stats['total'] / $perPage));
        if ($page > $lastPage) {
            $page = $lastPage;
        }

        match ($sort) {
            'recently_active' => $query->orderByDesc($t.'.updated_at'),
            'name_asc' => $query->orderBy($t.'.name'),
            default => $query->orderByDesc($t.'.created_at'),
        };

        $supporters = $query
            ->paginate($perPage, ['*'], 'page', $page)
            ->withQueryString();

        $supporters->getCollection()->transform(function (User $user) {
            $created = $user->created_at;
            $isNew = $created && $created->isAfter(now()->subWeek());

            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'slug' => $user->slug,
                'city' => $user->city,
                'state' => $user->state,
                'image' => $user->registered_user_image,
                'volunteer_interest_statement' => $user->volunteer_interest_statement,
                'created_at' => $user->created_at?->toIso8601String(),
                'updated_at' => $user->updated_at?->toIso8601String(),
                'is_new' => $isNew,
                'causes' => $user->supporterInterestCategories->map(fn ($c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                ])->values()->all(),
                'interested_positions' => $user->volunteerPreferredJobPositions->map(fn ($p) => [
                    'id' => $p->id,
                    'title' => $p->title,
                ])->values()->all(),
            ];
        });

        $positionOptions = JobPosition::query()
            ->orderBy('title')
            ->get(['id', 'title'])
            ->map(fn (JobPosition $p) => ['id' => $p->id, 'title' => $p->title])
            ->values()
            ->all();

        return Inertia::render('volunteers/available-supporters', [
            'supporters' => $supporters,
            'stats' => $stats,
            'positionOptions' => $positionOptions,
            'filters' => [
                'per_page' => $perPage,
                'page' => $page,
                'search' => $search,
                'city' => $city,
                'state' => $state,
                'skills' => $skills,
                'position_id' => $positionId > 0 ? $positionId : null,
                'sort' => $sort,
            ],
            'allowedPerPage' => [6, 12, 24, 48],
        ]);
    }

    private function buildStats($query, string $userTable): array
    {
        $idCol = $userTable.'.id';
        $total = (clone $query)->count();

        $newThisWeek = (clone $query)
            ->where($userTable.'.created_at', '>=', now()->subWeek())
            ->count();

        $idSub = (clone $query)->select($idCol);
        $interestedPositionKinds = (int) DB::table('user_volunteer_job_positions')
            ->whereIn('user_id', $idSub)
            ->distinct()
            ->count('job_position_id');

        return [
            'total' => $total,
            'new_this_week' => $newThisWeek,
            'interested_position_kinds' => $interestedPositionKinds,
            'response_rate' => null,
        ];
    }
}
