<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class NonprofitNewsArticle extends Model
{
    protected $table = 'nonprofit_news_articles';

    protected $fillable = [
        'source',
        'title',
        'link',
        'link_hash',
        'summary',
        'published_at',
        'image_url',
        'category',
    ];

    protected $casts = [
        'published_at' => 'datetime',
    ];

    public function scopePublished(Builder $query): Builder
    {
        return $query->whereNotNull('published_at');
    }

    public function scopeNewest(Builder $query): Builder
    {
        return $query->orderByDesc('published_at');
    }

    public function scopeSearch(Builder $query, ?string $q): Builder
    {
        if (blank($q)) {
            return $query;
        }
        $term = trim($q);
        $driver = config('database.default');
        if ($driver === 'mysql') {
            try {
                return $query->whereRaw('MATCH (title, summary) AGAINST (? IN NATURAL LANGUAGE MODE)', [$term]);
            } catch (\Throwable $e) {
                // Fallback if FULLTEXT not available
            }
        }
        return $query->where(function (Builder $builder) use ($term) {
            $builder->where('title', 'like', '%' . $term . '%')
                ->orWhere('summary', 'like', '%' . $term . '%')
                ->orWhere('source', 'like', '%' . $term . '%');
        });
    }

    public function scopeBySources(Builder $query, array $sources): Builder
    {
        if (empty($sources)) {
            return $query;
        }
        return $query->whereIn('source', $sources);
    }

    public function savedByUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_saved_nonprofit_news', 'nonprofit_news_article_id', 'user_id')
            ->withTimestamps();
    }
}
