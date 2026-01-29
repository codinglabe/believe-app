import { Head, Link, router } from "@inertiajs/react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { Heart, Share2, ExternalLink, ArrowLeft } from "lucide-react"
import { route } from "ziggy-js"

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

interface Props {
  articles: ArticleItem[]
}

function formatDate(s: string | null | undefined): string {
  if (!s) return ""
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function handleShare(title: string, link: string) {
  if (typeof navigator !== "undefined" && navigator.share) {
    navigator.share({ title, url: link, text: title }).catch(() => {
      copyToClipboard(link)
    })
  } else {
    copyToClipboard(link)
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    if (typeof window !== "undefined" && (window as any).toast) {
      ;(window as any).toast.success("Link copied to clipboard")
    }
  })
}

export default function SavedNews({ articles }: Props) {
  const unsave = (id: number) => {
    router.post(route("nonprofit.news.save.toggle", { article: id }), {}, {
      preserveScroll: true,
      preserveState: true,
    })
  }

  return (
    <FrontendLayout>
      <Head title="My Saved Articles – Nonprofit News" />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center justify-between mb-6">
            <Link href={route("nonprofit.news")} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to Nonprofit News
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">My Saved Articles</h1>
          <p className="text-muted-foreground mb-6">View your saved reads</p>

          {articles.length === 0 ? (
            <Card className="p-12 text-center">
              <CardContent className="p-0">
                <p className="text-muted-foreground font-medium">No saved articles yet</p>
                <p className="text-sm text-muted-foreground mt-1">Save articles from the news page to read them later.</p>
                <Link href={route("nonprofit.news")}>
                  <Button className="mt-4 gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Browse Nonprofit News
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {articles.map((item) => (
                <Card key={item.id} className="overflow-hidden flex flex-col sm:flex-row">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block sm:w-48 shrink-0"
                  >
                    <div className="aspect-video sm:aspect-square sm:h-full sm:min-h-[140px] bg-muted relative overflow-hidden">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="object-cover w-full h-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/5 text-muted-foreground text-xs">Article</div>
                      )}
                    </div>
                  </a>
                  <CardContent className="p-4 flex flex-col flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground line-clamp-2 mt-0">
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                        {item.title}
                      </a>
                    </h3>
                    {item.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1 flex-1">
                        {item.summary.slice(0, 150)}{item.summary.length > 150 ? "…" : ""}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2">
                      <span>{item.source}</span>
                      <span>{formatDate(item.published_at)}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <a href={item.link} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="gap-1">
                          Read
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-primary"
                        onClick={() => unsave(item.id)}
                      >
                        <Heart className="h-3.5 w-3.5 fill-current" />
                        Unsave
                      </Button>
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
        </div>
      </div>
    </FrontendLayout>
  )
}
