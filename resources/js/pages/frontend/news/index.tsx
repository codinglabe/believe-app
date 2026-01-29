import { Head, Link, router, useForm, usePage } from "@inertiajs/react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { useState, useEffect } from "react"
import { route } from "ziggy-js"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent } from "@/components/frontend/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/frontend/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/frontend/ui/dialog"
import { Search, Filter, Heart, Share2, ExternalLink, ChevronRight, Mail, Bookmark, Send } from "lucide-react"

interface ArticleItem {
  id: number
  source: string
  title: string
  link: string
  summary?: string | null
  published_at?: string | null
  image_url?: string | null
  category?: string | null
}

interface PaginatedArticles {
  data: ArticleItem[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  from?: number
  to?: number
  prev_page_url: string | null
  next_page_url: string | null
}

interface Props {
  featured: ArticleItem | null
  trending: ArticleItem[]
  articles: PaginatedArticles
  savedArticleIds: number[]
  filters: { q: string; sources: string[]; sort: string }
  allSources: string[]
  categoryOptions: Record<string, string>
  sortOptions: Record<string, string>
}

function formatDate(s: string | null | undefined): string {
  if (!s) return ""
  const d = new Date(s)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined })
}

function readTime(summary: string | null | undefined): string {
  if (!summary) return "1 min read"
  const words = summary.split(/\s+/).length
  const mins = Math.max(1, Math.ceil(words / 200))
  return `${mins} min read`
}

function handleShare(title: string, link: string) {
  if (typeof navigator !== "undefined" && navigator.share) {
    navigator.share({ title, url: link, text: title }).catch(() => copyLinkToClipboard(link))
  } else {
    copyLinkToClipboard(link)
  }
}

function copyLinkToClipboard(link: string) {
  navigator.clipboard.writeText(link).then(() => {
    if (typeof window !== "undefined" && (window as any).toast) {
      ;(window as any).toast.success("Link copied to clipboard")
    }
  })
}

export default function NonprofitNews({
  featured,
  trending,
  articles,
  savedArticleIds = [],
  filters,
  allSources,
  categoryOptions,
  sortOptions,
}: Props) {
  const { auth } = usePage().props as { auth?: { user?: { id: number } } }
  const isLoggedIn = !!auth?.user
  const [savedIds, setSavedIds] = useState<number[]>(savedArticleIds)
  const [savingId, setSavingId] = useState<number | null>(null)

  useEffect(() => {
    setSavedIds(savedArticleIds)
  }, [savedArticleIds])

  const isSaved = (id: number) => savedIds.includes(id)

  const toggleSave = async (articleId: number) => {
    if (!isLoggedIn) return
    setSavingId(articleId)
    try {
      const csrf = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? ""
      const res = await fetch(route("nonprofit.news.save.toggle", { article: articleId }), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-TOKEN": csrf,
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "same-origin",
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && typeof data.saved === "boolean") {
        setSavedIds((prev) =>
          data.saved ? [...prev, articleId] : prev.filter((id) => id !== articleId)
        )
      }
    } finally {
      setSavingId(null)
    }
  }

  const { data, setData } = useForm({
    q: filters.q || "",
    sources: filters.sources || [],
    sort: filters.sort || "newest",
    page: 1,
  })
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const applyFilters = (overrides: Partial<{ q: string; sources: string[]; sort: string; page: number }> = {}) => {
    router.get(route("nonprofit.news"), { ...data, ...overrides, page: overrides.page ?? 1 }, {
      preserveState: true,
      preserveScroll: true,
    })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    applyFilters({ page: 1 })
  }

  const handleSort = (value: string) => {
    setData("sort", value)
    applyFilters({ sort: value, page: 1 })
  }

  const toggleSource = (src: string) => {
    const next = data.sources.includes(src)
      ? data.sources.filter((s) => s !== src)
      : [...data.sources, src]
    setData("sources", next)
  }

  const clearFilters = () => {
    setData({ q: "", sources: [], sort: "newest", page: 1 })
    router.get(route("nonprofit.news"), {}, { preserveState: true })
    setFilterOpen(false)
  }

  const categoryList = Object.entries(categoryOptions)

  return (
    <FrontendLayout>
      <Head title="Nonprofit News – Daily signals for nonprofit leaders" />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <header className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              Nonprofit News
            </h1>
            <p className="mt-2 text-muted-foreground text-lg">
              Daily signals for nonprofit leaders + community impact
            </p>
          </header>

          {/* Search + Filters bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Search headlines, topics, organizations"
                  value={data.q}
                  onChange={(e) => setData("q", e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <Button type="submit" variant="default" size="default">
                Search
              </Button>
            </form>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={() => setFilterOpen(true)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>
              <Select value={data.sort} onValueChange={handleSort}>
                <SelectTrigger className="w-[140px] bg-background">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(sortOptions).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Featured (hero) */}
              {featured && (
                <Card className="overflow-hidden border-0 shadow-lg">
                  <a
                    href={featured.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group"
                  >
                    <div className="aspect-[16/9] bg-muted relative overflow-hidden">
                      {featured.image_url ? (
                        <img
                          src={featured.image_url}
                          alt=""
                          className="object-cover w-full h-full group-hover:scale-[1.02] transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary/60">
                          <span className="text-sm font-medium">Featured</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <h2 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg line-clamp-2">
                          {featured.title}
                        </h2>
                      </div>
                    </div>
                  </a>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm font-semibold text-primary">BIU Take</span>
                      <span className="text-sm text-muted-foreground">
                        Why it matters: {featured.summary ? featured.summary.slice(0, 80) + (featured.summary.length > 80 ? "…" : "") : "Latest from " + featured.source}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                        What to do
                      </span>
                      <span className="text-xs text-muted-foreground">Read and share with your network</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{featured.source}</span>
                      <span>{featured.published_at ? formatDate(featured.published_at) : ""}</span>
                      <span>{readTime(featured.summary)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <a href={featured.link} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" className="gap-1">
                          Read More
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                      {isLoggedIn ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className={`gap-1 ${isSaved(featured.id) ? "text-primary" : ""}`}
                          onClick={() => toggleSave(featured.id)}
                          disabled={savingId === featured.id}
                        >
                          <Heart className={`h-3.5 w-3.5 ${isSaved(featured.id) ? "fill-current" : ""}`} />
                          {isSaved(featured.id) ? "Saved" : "Save"}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => handleShare(featured.title, featured.link)}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        Share
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Category pills */}
              <div className="flex flex-wrap gap-2">
                {categoryList.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                      selectedCategory === key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-input text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Articles grid */}
              {articles.data.length === 0 ? (
                <Card className="p-12 text-center">
                  <CardContent className="p-0">
                    <p className="text-muted-foreground font-medium">No articles found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {articles.total > 0
                        ? "Try adjusting your search or filters."
                        : "News is loading from our sources. Check back soon."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {articles.data.map((item) => (
                  <Card key={item.id} className="overflow-hidden flex flex-col">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block flex-1"
                    >
                      <div className="aspect-video bg-muted relative overflow-hidden">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt=""
                            className="object-cover w-full h-full hover:scale-[1.02] transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/5 text-muted-foreground">
                            <span className="text-xs">Article</span>
                          </div>
                        )}
                      </div>
                    </a>
                    <CardContent className="p-4 flex flex-col flex-1">
                      <h3 className="font-semibold text-foreground line-clamp-2 mt-0">
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                          {item.title}
                        </a>
                      </h3>
                      {item.summary && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1 flex-1">
                          {item.summary.slice(0, 120)}{item.summary.length > 120 ? "…" : ""}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2">
                        <span>{item.source}</span>
                        <span>{formatDate(item.published_at)}</span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {isLoggedIn ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className={`gap-1 ${isSaved(item.id) ? "text-primary" : "text-muted-foreground"}`}
                            onClick={() => toggleSave(item.id)}
                            disabled={savingId === item.id}
                          >
                            <Heart className={`h-3.5 w-3.5 ${isSaved(item.id) ? "fill-current" : ""}`} />
                            {isSaved(item.id) ? "Saved" : "Save"}
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-muted-foreground"
                          onClick={() => handleShare(item.title, item.link)}
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          Share
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              )}

              {/* Pagination */}
              {articles.last_page > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {articles.current_page} of {articles.last_page}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={articles.current_page <= 1}
                      onClick={() => applyFilters({ page: articles.current_page - 1 })}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={articles.current_page >= articles.last_page}
                      onClick={() => applyFilters({ page: articles.current_page + 1 })}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground mb-3">Trending News</h3>
                  <ul className="space-y-2">
                    {trending.length > 0 ? (
                      trending.map((t) => (
                        <li key={t.id}>
                          <a
                            href={t.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-2 text-sm text-foreground hover:text-primary group"
                          >
                            <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground group-hover:text-primary" />
                            <span className="line-clamp-2 flex-1">{t.title}</span>
                          </a>
                          <p className="text-xs text-muted-foreground ml-6 mt-0.5">
                            {t.source} | {formatDate(t.published_at)}
                          </p>
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-muted-foreground">No trending items yet.</li>
                    )}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-semibold text-foreground">Weekly Briefing</h3>
                  <p className="text-sm text-muted-foreground">Top insights sent to your inbox</p>
                  <Button size="sm" className="w-full gap-2">
                    <Mail className="h-4 w-4" />
                    Subscribe
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-semibold text-foreground">My Saved Articles</h3>
                  <p className="text-sm text-muted-foreground">View your saved reads</p>
                  {isLoggedIn ? (
                    <Link href={route("nonprofit.news.saved")}>
                      <Button size="sm" variant="outline" className="w-full gap-2">
                        <Bookmark className="h-4 w-4" />
                        Go to Saved
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`${route("login")}?redirect=${encodeURIComponent(route("nonprofit.news"))}`}>
                      <Button size="sm" variant="outline" className="w-full gap-2">
                        Log in to view saved
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-semibold text-foreground">Submit a News Tip</h3>
                  <p className="text-sm text-muted-foreground">Share a story with us.</p>
                  <Link href={route("contact")}>
                    <Button size="sm" variant="outline" className="w-full gap-2">
                      <Send className="h-4 w-4" />
                      Submit Link
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </div>

      {/* Filters modal */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filter by source</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Select sources to show</p>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {allSources.map((src) => (
                <label key={src} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.sources.length === 0 || data.sources.includes(src)}
                    onChange={() => toggleSource(src)}
                    className="rounded border-input"
                  />
                  <span className="text-sm">{src}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => { applyFilters({ page: 1 }); setFilterOpen(false) }}>
                Apply
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </FrontendLayout>
  )
}
