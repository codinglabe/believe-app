<?php

namespace App\Http\Controllers\CareAlliance;

use App\Http\Controllers\Controller;
use App\Services\CareAlliancePublicPageService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class CareAlliancePublicController extends Controller
{
    public function __construct(
        protected CareAlliancePublicPageService $publicPage
    ) {}

    public function show(Request $request, string $allianceSlug)
    {
        $alliance = $this->publicPage->resolveAlliance($allianceSlug);
        $props = $this->publicPage->buildInertiaProps($alliance, $request, null);

        return $this->renderAlliancePublic($alliance, $props);
    }

    public function products(Request $request, string $allianceSlug)
    {
        $alliance = $this->publicPage->resolveAlliance($allianceSlug);
        $props = $this->publicPage->buildInertiaProps($alliance, $request, 'products');

        return $this->renderAlliancePublic($alliance, $props);
    }

    public function jobs(Request $request, string $allianceSlug)
    {
        $alliance = $this->publicPage->resolveAlliance($allianceSlug);
        $props = $this->publicPage->buildInertiaProps($alliance, $request, 'jobs');

        return $this->renderAlliancePublic($alliance, $props);
    }

    public function events(Request $request, string $allianceSlug)
    {
        $alliance = $this->publicPage->resolveAlliance($allianceSlug);
        $props = $this->publicPage->buildInertiaProps($alliance, $request, 'events');

        return $this->renderAlliancePublic($alliance, $props);
    }

    public function about(Request $request, string $allianceSlug)
    {
        $alliance = $this->publicPage->resolveAlliance($allianceSlug);
        $props = $this->publicPage->buildInertiaProps($alliance, $request, 'about');

        return $this->renderAlliancePublic($alliance, $props);
    }

    public function contact(Request $request, string $allianceSlug)
    {
        $alliance = $this->publicPage->resolveAlliance($allianceSlug);
        $props = $this->publicPage->buildInertiaProps($alliance, $request, 'contact');

        return $this->renderAlliancePublic($alliance, $props);
    }

    public function members(Request $request, string $allianceSlug)
    {
        $alliance = $this->publicPage->resolveAlliance($allianceSlug);
        $props = $this->publicPage->buildInertiaProps($alliance, $request, 'members');

        return $this->renderAlliancePublic($alliance, $props);
    }

    public function supporters(Request $request, string $allianceSlug)
    {
        $alliance = $this->publicPage->resolveAlliance($allianceSlug);
        $props = $this->publicPage->buildInertiaProps($alliance, $request, 'supporters');

        return $this->renderAlliancePublic($alliance, $props);
    }

    /**
     * @param  array<string, mixed>  $props
     */
    protected function renderAlliancePublic(\App\Models\CareAlliance $alliance, array $props): \Inertia\Response
    {
        $descriptionPlain = $alliance->description ? trim(strip_tags($alliance->description)) : '';

        return Inertia::render('frontend/organization/organization-show', array_merge($props, [
            'seo' => [
                'title' => $alliance->name.' — Care Alliance | '.config('app.name'),
                'description' => $descriptionPlain !== '' ? Str::limit($descriptionPlain, 160) : 'Support member nonprofits through '.$alliance->name.'.',
            ],
        ]));
    }
}
