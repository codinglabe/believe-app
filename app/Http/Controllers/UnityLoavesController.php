<?php

namespace App\Http\Controllers;

use App\Models\UnityLoavesLocation;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class UnityLoavesController extends Controller
{
    /**
     * Main Unity Loaves Directory page (filters, search, pagination).
     */
    public function index(Request $request)
    {
        $query = UnityLoavesLocation::query()->active();

        // ── Search ──
        $search = trim((string) $request->get('q', ''));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', '%'.$search.'%')
                  ->orWhere('city', 'LIKE', '%'.$search.'%')
                  ->orWhere('state', 'LIKE', '%'.$search.'%')
                  ->orWhere('zip', 'LIKE', '%'.$search.'%')
                  ->orWhere('address', 'LIKE', '%'.$search.'%');
            });
        }

        // ── Meal Type filter ──
        $mealType = $request->get('meal_type', '');
        if ($mealType !== '' && $mealType !== 'all') {
            $query->where('meal_type', $mealType);
        }

        // ── Day filter ──
        $day = $request->get('day', '');
        if ($day !== '' && $day !== 'any') {
            $query->whereHas('schedules', function ($q) use ($day) {
                $q->where('schedule_type', 'meal')
                  ->where('day_of_week', strtolower($day));
            });
        }

        // ── Food donations filter ──
        $donations = $request->get('food_donations', '');
        if ($donations === 'yes') {
            $query->where('accepts_food_donations', true);
        } elseif ($donations === 'no') {
            $query->where('accepts_food_donations', false);
        }

        // ── Service type filter ──
        $serviceType = $request->get('service_type', '');
        if ($serviceType !== '') {
            $query->whereHas('schedules', function ($q) use ($serviceType) {
                $q->where('schedule_type', 'service')
                  ->where('title', 'LIKE', '%'.$serviceType.'%');
            });
        }

        // ── Location filter (city / zip) ──
        $location = trim((string) $request->get('location', ''));
        if ($location !== '') {
            $query->where(function ($q) use ($location) {
                $q->where('city', 'LIKE', '%'.$location.'%')
                  ->orWhere('zip', 'LIKE', '%'.$location.'%')
                  ->orWhere('state', 'LIKE', '%'.$location.'%');
            });
        }

        // ── Eager-load relationships ──
        $query->with([
            'schedules',
            'needs' => fn ($q) => $q->where('is_active', true),
            'impactStat',
        ]);

        // ── Sort ──
        $sort = $request->get('sort', 'name');
        if ($sort === 'loaves') {
            $query->withMax('impactStat as max_loaves', 'loaves_served')
                  ->orderByDesc('max_loaves');
        } else {
            $query->orderBy('name');
        }

        $paginator = $query->paginate(12)->withQueryString();

        $locations = $paginator->through(function (UnityLoavesLocation $loc) {
            $mealSchedules   = $loc->schedules->where('schedule_type', 'meal');
            $dropoffSchedules = $loc->schedules->where('schedule_type', 'dropoff');
            $serviceSchedules = $loc->schedules->where('schedule_type', 'service');

            return [
                'id'                     => $loc->id,
                'name'                   => $loc->name,
                'description'            => $loc->description ? Str::limit(strip_tags($loc->description), 180) : null,
                'full_description'       => $loc->description,
                'address'                => $loc->address,
                'city'                   => $loc->city,
                'state'                  => $loc->state,
                'zip'                    => $loc->zip,
                'full_address'           => implode(', ', array_filter([$loc->address, $loc->city, $loc->state.' '.$loc->zip])),
                'latitude'               => $loc->latitude,
                'longitude'              => $loc->longitude,
                'phone'                  => $loc->phone,
                'website'                => $loc->website,
                'image_url'              => $loc->image_url,
                'meal_type'              => $loc->meal_type,
                'meal_type_label'        => $this->mealTypeLabel($loc->meal_type),
                'accepts_food_donations' => $loc->accepts_food_donations,
                'dropoff_instructions'   => $loc->dropoff_instructions,
                'distance'               => round(mt_rand(10, 100) / 10, 1), // Placeholder for UI
                'needs_summary'          => $loc->needs->count() > 0 ? 'Needs ' . $loc->needs->take(2)->pluck('item_name')->join(', ') : '',
                'meal_schedules'         => $mealSchedules->map(fn ($s) => [
                    'title'           => $s->title,
                    'day_of_week'     => $s->day_of_week,
                    'start_time'      => $s->start_time?->format('g:i A'),
                    'end_time'        => $s->end_time?->format('g:i A'),
                    'recurrence_text' => $s->recurrence_text,
                ])->values(),
                'dropoff_schedules'      => $dropoffSchedules->map(fn ($s) => [
                    'title'           => $s->title,
                    'start_time'      => $s->start_time?->format('g:i A'),
                    'end_time'        => $s->end_time?->format('g:i A'),
                    'recurrence_text' => $s->recurrence_text,
                ])->values(),
                'service_schedules'      => $serviceSchedules->map(fn ($s) => [
                    'title'           => $s->title,
                    'day_of_week'     => $s->day_of_week,
                    'start_time'      => $s->start_time?->format('g:i A'),
                    'end_time'        => $s->end_time?->format('g:i A'),
                    'recurrence_text' => $s->recurrence_text,
                ])->values(),
                'current_needs'          => $loc->needs->map(fn ($n) => [
                    'item_name'      => $n->item_name,
                    'category'       => $n->category,
                    'priority_level' => $n->priority_level,
                    'quantity_needed' => $n->quantity_needed,
                ])->values(),
                'impact'                 => $loc->impactStat ? [
                    'loaves_served'    => $loc->impactStat->loaves_served,
                    'families_helped'  => $loc->impactStat->families_helped,
                    'total_loaves_year' => $loc->impactStat->total_loaves_year,
                ] : null,
            ];
        });

        return Inertia::render('frontend/unity-loaves/index', [
            'seo'         => \App\Services\SeoService::forPage('unity_loaves'),
            'locations'   => $locations,
            'searchQuery' => $search,
            'filters'     => [
                'meal_type'      => $mealType,
                'day'            => $day,
                'food_donations' => $donations,
                'service_type'   => $serviceType,
                'location'       => $location,
                'sort'           => $sort,
            ],
        ]);
    }

    private function mealTypeLabel(string $type): string
    {
        return match ($type) {
            'food_pantry'    => 'Food Pantry',
            'hot_meals'      => 'Hot Meals',
            'community_meal' => 'Community Meal',
            default          => ucfirst(str_replace('_', ' ', $type)),
        };
    }
}
