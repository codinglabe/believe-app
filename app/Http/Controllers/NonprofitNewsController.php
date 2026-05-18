<?php

namespace App\Http\Controllers;

use App\Models\NonprofitNewsArticle;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NonprofitNewsController extends Controller
{
    private const PER_PAGE = 12;
    private const TRENDING_LIMIT = 5;

    public function index(Request $request): Response
    {
        $query = trim((string) $request->query('q'));
        $sources = $request->query('sources', []);
        $sources = is_array($sources) ? $sources : (array) $sources;
        $sort = $request->query('sort', 'newest');
        $page = max(1, (int) $request->query('page', 1));

        $baseQuery = NonprofitNewsArticle::query()
            ->published()
            ->select(['id', 'source', 'title', 'link', 'summary', 'published_at', 'image_url', 'category']);

        $baseQuery->search($query);
        $baseQuery->bySources($sources);

        $featured = (clone $baseQuery)->newest()->first();
        $trending = (clone $baseQuery)->newest()->limit(self::TRENDING_LIMIT)->get();

        if ($featured) {
            $baseQuery->where('id', '!=', $featured->id);
        }
        $mainQuery = clone $baseQuery;
        $mainQuery = $sort === 'oldest' ? $mainQuery->orderBy('published_at') : $mainQuery->newest();
        $paginator = $mainQuery->paginate(self::PER_PAGE, ['*'], 'page', $page);
        $paginator->getCollection()->transform(fn ($a) => $this->transformArticle($a));

        $allSources = NonprofitNewsArticle::query()
            ->published()
            ->distinct()
            ->pluck('source')
            ->sort()
            ->values()
            ->all();

        $categoryOptions = $this->getCategoryOptions();

        $savedArticleIds = [];
        $user = $request->user();
        if ($user) {
            $savedArticleIds = $user->savedNewsArticles()->pluck('nonprofit_news_articles.id')->all();
        }

        return Inertia::render('frontend/news/index', [
            'featured' => $featured ? $this->transformArticle($featured) : null,
            'trending' => $trending->map(fn ($a) => $this->transformArticle($a))->all(),
            'articles' => $paginator,
            'savedArticleIds' => $savedArticleIds,
            'filters' => [
                'q' => $query,
                'sources' => $sources,
                'sort' => $sort,
            ],
            'allSources' => $allSources,
            'categoryOptions' => $categoryOptions,
            'sortOptions' => [
                'newest' => 'Newest',
                'oldest' => 'Oldest',
            ],
        ]);
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

    private function getCategoryOptions(): array
    {
        return [
            'Funding & Grants' => 'Funding & Grants',
            'Compliance' => 'Compliance',
            'Technology' => 'Technology',
            'HR & Leadership' => 'HR & Leadership',
            'Policy' => 'Policy',
            'Global Issues' => 'Global Issues',
        ];
    }
}
