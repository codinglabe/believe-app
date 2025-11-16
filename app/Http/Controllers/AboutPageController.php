<?php

namespace App\Http\Controllers;

use App\Models\AboutPageContent;
use Inertia\Inertia;

class AboutPageController extends Controller
{
    public function __invoke()
    {
        $content = AboutPageContent::first();

        return Inertia::render('frontend/about', [
            'content' => $content?->getFrontendContent(),
        ]);
    }
}


