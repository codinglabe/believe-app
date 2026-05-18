<?php

namespace App\Http\Controllers;

use App\Models\AboutPageContent;
use App\Services\SeoService;
use Inertia\Inertia;

class AboutPageController extends Controller
{
    public function __invoke()
    {
        $content = AboutPageContent::first();

        return Inertia::render('frontend/about', [
            'seo' => SeoService::forPage('about'),
            'content' => $content?->getFrontendContent(),
        ]);
    }
}


