<?php

namespace App\Http\Controllers;

use App\Models\NonprofitNewsArticle;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SavedNewsController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $saved = $user->savedNewsArticles()
            ->published()
            ->newest()
            ->get()
            ->map(fn (NonprofitNewsArticle $a) => $this->transformArticle($a));

        return Inertia::render('frontend/news/saved', [
            'articles' => $saved,
        ]);
    }

    public function toggle(Request $request, NonprofitNewsArticle $article): \Illuminate\Http\JsonResponse|\Illuminate\Http\RedirectResponse
    {
        $user = $request->user();
        $saved = $user->savedNewsArticles()->where('nonprofit_news_article_id', $article->id)->exists();

        if ($saved) {
            $user->savedNewsArticles()->detach($article->id);
            $saved = false;
        } else {
            $user->savedNewsArticles()->syncWithoutDetaching([$article->id]);
            $saved = true;
        }

        if ($request->expectsJson()) {
            return response()->json(['saved' => $saved]);
        }
        return redirect()->back();
    }

    private function transformArticle(NonprofitNewsArticle $a): array
    {
        return [
            'id' => $a->id,
            'source' => $a->source,
            'title' => $a->title,
            'link' => $a->link,
            'summary' => $a->summary,
            'published_at' => $a->published_at?->toIso8601String(),
            'image_url' => $a->image_url,
            'category' => $a->category,
        ];
    }
}
