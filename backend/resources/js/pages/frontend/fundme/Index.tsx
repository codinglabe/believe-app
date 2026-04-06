"use client";

import { Head, Link, router } from "@inertiajs/react";
import FrontendLayout from "@/layouts/frontend/frontend-layout";
import { Button } from "@/components/frontend/ui/button";
import { Card, CardContent } from "@/components/frontend/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/frontend/ui/select";
import { Heart, TrendingUp, Sparkles, ArrowRight, Image as ImageIcon } from "lucide-react";
import { route } from "ziggy-js";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/frontend/ui/pagination";

interface CampaignItem {
  id: number;
  title: string;
  slug: string;
  goal_amount_dollars: number;
  raised_amount_dollars: number;
  progress_percent: number;
  cover_image: string | null;
  organization: { id: number; name: string; image: string | null } | null;
  category: { id: number; name: string; slug: string } | null;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Props {
  campaigns: {
    data: CampaignItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
    path: string;
    links: Array<{ url: string | null; label: string; active: boolean }>;
  };
  categories: Category[];
  filters: { category: string | number; sort: string; per_page: number };
  sortOptions: Record<string, string>;
}

const ALL_CATEGORIES_VALUE = "__all__";

export default function FundMeIndex({ campaigns, categories, filters, sortOptions }: Props) {
  const setFilter = (key: string, value: string | number) => {
    const params: Record<string, string | number> = { ...filters, [key]: value, page: 1 };
    if (key === "category" && value === ALL_CATEGORIES_VALUE) {
      params.category = "";
    }
    router.get(route("fundme.index"), params, { preserveState: true });
  };

  const categoryValue = filters.category && String(filters.category) !== "" ? String(filters.category) : ALL_CATEGORIES_VALUE;

  return (
    <FrontendLayout>
      <Head title="Believe FundMe – Get Funding" />
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
        <section className="relative py-12 md:py-20 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.15),transparent)]" />
          <div className="container mx-auto relative z-10 text-center max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <Sparkles className="h-4 w-4" />
              Believe FundMe
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Fundraising for{" "}
              <span className="text-primary">Believe</span> nonprofits
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Discover and support verified nonprofit campaigns. Your gift goes directly to the cause.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-16">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={categoryValue}
                onValueChange={(v) => setFilter("category", v)}
              >
                <SelectTrigger className="w-[200px] bg-background border-input">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CATEGORIES_VALUE}>All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.sort || "newest"}
                onValueChange={(v) => setFilter("sort", v)}
              >
                <SelectTrigger className="w-[180px] bg-background border-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(sortOptions).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              {campaigns.total} campaign{campaigns.total !== 1 ? "s" : ""}
            </p>
          </div>

          {campaigns.data.length === 0 ? (
            <Card className="p-12 text-center">
              <Heart className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h2 className="text-xl font-semibold">No campaigns yet</h2>
              <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                Check back soon for new fundraising campaigns from Believe nonprofits.
              </p>
              <Link href="/">
                <Button variant="outline" className="mt-6">Back to home</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.data.map((c) => (
                <Link key={c.id} href={route("fundme.show", { slug: c.slug })}>
                  <Card className="overflow-hidden h-full transition-all hover:shadow-lg hover:border-primary/20 group">
                    <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                      {c.cover_image ? (
                        <img
                          src={c.cover_image}
                          alt=""
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ImageIcon className="h-14 w-14 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${Math.min(100, c.progress_percent)}%` }}
                        />
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <p className="text-xs font-medium text-primary uppercase tracking-wider">
                        {c.category?.name ?? "Campaign"}
                      </p>
                      <h3 className="font-semibold text-lg mt-1 line-clamp-2 group-hover:text-primary transition-colors">
                        {c.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {c.organization?.name ?? "Nonprofit"}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-medium">
                          ${c.raised_amount_dollars.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} raised
                        </span>
                        <span className="text-xs text-muted-foreground">
                          of ${c.goal_amount_dollars.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-1 text-primary text-sm font-medium">
                        <span>Support</span>
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {campaigns.last_page > 1 && (
            <div className="mt-10 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href={campaigns.prev_page_url ?? "#"}
                      className={!campaigns.prev_page_url ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  {campaigns.links?.slice(1, -1).map((link, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        href={link.url ?? "#"}
                        isActive={link.active}
                        className={!link.url ? "pointer-events-none" : ""}
                      >
                        {link.label}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href={campaigns.next_page_url ?? "#"}
                      className={!campaigns.next_page_url ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </section>
      </div>
    </FrontendLayout>
  );
}
