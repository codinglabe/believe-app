"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Head, useForm, usePage } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ImageUpload } from "@/components/admin/ImageUpload"
import {
  Save,
  Search,
  Home,
  ImageIcon,
  Globe,
  FileText,
  ChevronDown,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { BreadcrumbItem } from "@/types"

interface PageSeo {
  title: string
  description: string
  subtitle?: string
  share_image?: string
  share_image_url?: string
  remove_share_image?: boolean
}

interface SeoSettings {
  site_name: string
  default_description: string
  default_share_image: string
  default_share_image_url?: string
  pages: Record<string, PageSeo>
}

interface AdminSeoIndexProps {
  settings: SeoSettings
  pageKeys: Record<string, string>
}

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "System Management", href: "#" },
  { title: "SEO Settings", href: "/admin/seo" },
]

function charCount(value: string, recommended: number) {
  const length = value.length
  const tone = length === 0 ? "text-muted-foreground" : length <= recommended ? "text-green-600" : "text-amber-600"
  return <span className={`text-xs tabular-nums ${tone}`}>{length}/{recommended}</span>
}

function buildInitialPages(settings: SeoSettings, pageKeys: Record<string, string>) {
  const pages: Record<string, PageSeo> = {}
  Object.keys(pageKeys).forEach((key) => {
    pages[key] = {
      title: settings.pages[key]?.title ?? "",
      description: settings.pages[key]?.description ?? "",
      subtitle: settings.pages[key]?.subtitle ?? "",
      share_image: settings.pages[key]?.share_image ?? "",
      share_image_url: settings.pages[key]?.share_image_url ?? "",
      remove_share_image: false,
    }
  })
  return pages
}

function SerpPreview({
  siteName,
  title,
  description,
  url = "believeinunity.org",
}: {
  siteName: string
  title: string
  description: string
  url?: string
}) {
  const displayTitle = title.trim() || "Page title"
  const displayDescription = description.trim() || "Meta description appears here in search results."
  const fullTitle = displayTitle.includes(siteName) ? displayTitle : `${displayTitle} | ${siteName || "Site"}`

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-950">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Google preview</p>
      <div className="space-y-1 font-[Arial,sans-serif]">
        <p className="truncate text-sm text-[#202124] dark:text-gray-300">{url}</p>
        <p className="line-clamp-1 text-xl text-[#1a0dab] dark:text-blue-400">{fullTitle}</p>
        <p className="line-clamp-2 text-sm leading-snug text-[#4d5156] dark:text-gray-400">{displayDescription}</p>
      </div>
    </div>
  )
}

function HeroPreview({ headline, subtitle }: { headline: string; subtitle: string }) {
  return (
    <div className="overflow-hidden rounded-xl border shadow-sm">
      <p className="border-b bg-muted/50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Homepage hero preview
      </p>
      <div className="relative min-h-[180px] bg-gradient-to-r from-[#0b061a] via-[#13062b] to-[#2d1560] p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_45%,rgba(147,51,234,0.35),transparent_65%)]" />
        <div className="relative max-w-lg space-y-3">
          <h2 className="text-lg font-bold leading-tight text-white sm:text-xl md:text-2xl">
            {headline.trim() || "Homepage headline"}
          </h2>
          <p className="text-sm font-medium">
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              {subtitle.trim() || "Feature line • appears • here"}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

function FieldGroup({
  label,
  htmlFor,
  hint,
  counter,
  children,
  error,
}: {
  label: string
  htmlFor?: string
  hint?: string
  counter?: React.ReactNode
  children: React.ReactNode
  error?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </Label>
        {counter}
      </div>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

export default function AdminSeoIndex({ settings, pageKeys }: AdminSeoIndexProps) {
  const pageKeyEntries = Object.entries(pageKeys)
  const otherPageEntries = pageKeyEntries.filter(([key]) => key !== "home")
  const [query, setQuery] = useState("")
  const [openPages, setOpenPages] = useState<Record<string, boolean>>({ home: true })
  const { flash } = usePage<{ flash?: { success?: string } }>().props

  const { data, setData, post, processing, errors, transform } = useForm({
    site_name: settings.site_name || "",
    default_description: settings.default_description || "",
    default_share_image: settings.default_share_image || "",
    remove_default_share_image: false,
    default_share_image_file: null as File | null,
    pages: buildInitialPages(settings, pageKeys),
    page_share_image_files: {} as Record<string, File | null>,
  })

  transform((formData) => ({
    ...formData,
    _method: "put",
  }))

  const homePage = data.pages.home

  const filteredPages = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return otherPageEntries
    return otherPageEntries.filter(([key, label]) => key.includes(q) || label.toLowerCase().includes(q))
  }, [otherPageEntries, query])

  const configuredCount = useMemo(
    () => otherPageEntries.filter(([key]) => data.pages[key]?.title?.trim() || data.pages[key]?.description?.trim()).length,
    [otherPageEntries, data.pages],
  )

  const handlePageChange = (key: string, field: keyof PageSeo, value: string) => {
    setData("pages", {
      ...data.pages,
      [key]: {
        ...(data.pages[key] || { title: "", description: "", subtitle: "" }),
        [field]: value,
      },
    })
  }

  const handlePageShareImageChange = (key: string, file: File | null) => {
    setData("page_share_image_files", {
      ...data.page_share_image_files,
      [key]: file,
    })
    if (file) {
      setData("pages", {
        ...data.pages,
        [key]: {
          ...data.pages[key],
          remove_share_image: false,
        },
      })
    }
  }

  const handleRemovePageShareImage = (key: string) => {
    setData("page_share_image_files", {
      ...data.page_share_image_files,
      [key]: null,
    })
    setData("pages", {
      ...data.pages,
      [key]: {
        ...data.pages[key],
        remove_share_image: true,
        share_image_url: "",
      },
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post(route("admin.seo.update"), {
      forceFormData: true,
      preserveScroll: true,
    })
  }

  const togglePage = (key: string, open: boolean) => {
    setOpenPages((prev) => ({ ...prev, [key]: open }))
  }

  useEffect(() => {
    let updated = false
    const nextPages = { ...data.pages }
    pageKeyEntries.forEach(([key]) => {
      if (!nextPages[key]) {
        nextPages[key] = { title: "", description: "", subtitle: "" }
        updated = true
      }
    })
    if (updated) {
      setData("pages", nextPages)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const defaultSharePreview = data.remove_default_share_image
    ? null
    : data.default_share_image_file
      ? null
      : settings.default_share_image_url || null

  const homeSharePreview = homePage?.remove_share_image
    ? null
    : data.page_share_image_files.home
      ? null
      : homePage?.share_image_url || null

  const renderPageFields = (key: string, label: string, options?: { showSubtitle?: boolean; titleLabel?: string }) => {
    const page = data.pages[key]
    const pageSharePreview = page?.remove_share_image
      ? null
      : data.page_share_image_files[key]
        ? null
        : page?.share_image_url || null
    const isConfigured = Boolean(page?.title?.trim() || page?.description?.trim())

    return (
      <Collapsible
        key={key}
        open={openPages[key] ?? false}
        onOpenChange={(open) => togglePage(key, open)}
        className="rounded-lg border bg-card"
      >
        <CollapsibleTrigger className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40">
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", openPages[key] && "rotate-180")}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{label}</span>
              <span className="text-xs text-muted-foreground">({key})</span>
              {isConfigured ? (
                <Badge variant="secondary" className="text-[10px]">Configured</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">Default</Badge>
              )}
            </div>
            {page?.title?.trim() && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{page.title}</p>
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t px-4 pb-4 pt-3">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <FieldGroup
                label={options?.titleLabel ?? "Meta title"}
                htmlFor={`page-${key}-title`}
                counter={charCount(page?.title ?? "", 60)}
              >
                <Input
                  id={`page-${key}-title`}
                  value={page?.title ?? ""}
                  onChange={(e) => handlePageChange(key, "title", e.target.value)}
                  placeholder={`e.g. ${label}`}
                />
              </FieldGroup>

              {options?.showSubtitle && (
                <FieldGroup
                  label="Homepage feature line"
                  htmlFor={`page-${key}-subtitle`}
                  hint="Shown under the headline on the live homepage hero."
                >
                  <Textarea
                    id={`page-${key}-subtitle`}
                    value={page?.subtitle ?? ""}
                    onChange={(e) => handlePageChange(key, "subtitle", e.target.value)}
                    placeholder="Donations • CRM • Volunteers • Events • …"
                    rows={2}
                    className="resize-none"
                  />
                </FieldGroup>
              )}

              <FieldGroup
                label="Meta description"
                htmlFor={`page-${key}-description`}
                counter={charCount(page?.description ?? "", 160)}
                hint="Recommended 150–160 characters for search snippets."
              >
                <Textarea
                  id={`page-${key}-description`}
                  value={page?.description ?? ""}
                  onChange={(e) => handlePageChange(key, "description", e.target.value)}
                  placeholder="Short description for search results"
                  rows={3}
                  className="resize-none"
                />
              </FieldGroup>
            </div>

            <div className="space-y-4">
              <SerpPreview
                siteName={data.site_name}
                title={page?.title ?? ""}
                description={page?.description ?? ""}
              />
              <FieldGroup label="Share image override">
                <ImageUpload
                  inputId={`seo-page-${key}-share-image`}
                  label=""
                  value={pageSharePreview}
                  onChange={(file) => {
                    if (!file) {
                      handleRemovePageShareImage(key)
                      return
                    }
                    handlePageShareImageChange(key, file)
                  }}
                  processing={processing}
                  maxFileSizeKb={5120}
                />
              </FieldGroup>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="SEO Settings - System Management" />

      <form onSubmit={handleSubmit} className="pb-24">
        <div className="space-y-6 p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-7 w-7 text-purple-600" />
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">SEO Settings</h1>
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                Control search titles, social previews, and the homepage hero. Changes to Home apply live on the public homepage.
              </p>
            </div>
            <Button type="submit" disabled={processing} className="shrink-0 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <Save className="mr-2 h-4 w-4" />
              {processing ? "Saving…" : "Save changes"}
            </Button>
          </div>

          {flash?.success && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
              {flash.success}
            </div>
          )}

          <Tabs defaultValue="homepage" className="space-y-6">
            <TabsList className="grid h-auto w-full max-w-xl grid-cols-3 p-1">
              <TabsTrigger value="homepage" className="gap-1.5 py-2">
                <Home className="h-4 w-4" />
                Homepage
              </TabsTrigger>
              <TabsTrigger value="global" className="gap-1.5 py-2">
                <Globe className="h-4 w-4" />
                Global
              </TabsTrigger>
              <TabsTrigger value="pages" className="gap-1.5 py-2">
                <FileText className="h-4 w-4" />
                All pages
              </TabsTrigger>
            </TabsList>

            {/* Homepage tab */}
            <TabsContent value="homepage" className="mt-0 space-y-6">
              <Card className="border-purple-200/60 dark:border-purple-900/40">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>Homepage</CardTitle>
                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/40 dark:text-purple-300">
                      Live hero
                    </Badge>
                  </div>
                  <CardDescription>
                    The headline and feature line below appear on the public homepage. Meta title and description power search and social sharing.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-8 xl:grid-cols-2">
                    <div className="space-y-5">
                      <FieldGroup
                        label="Homepage headline"
                        htmlFor="page-home-title"
                        counter={charCount(homePage?.title ?? "", 60)}
                        hint="Used as the H1 on the homepage and as the meta title."
                      >
                        <Input
                          id="page-home-title"
                          value={homePage?.title ?? ""}
                          onChange={(e) => handlePageChange("home", "title", e.target.value)}
                          placeholder="The Affordable All-in-One Operating System for Nonprofits"
                        />
                      </FieldGroup>

                      <FieldGroup
                        label="Feature line"
                        htmlFor="page-home-subtitle"
                        hint="Bullet-style list shown under the headline (use • between items)."
                      >
                        <Textarea
                          id="page-home-subtitle"
                          value={homePage?.subtitle ?? ""}
                          onChange={(e) => handlePageChange("home", "subtitle", e.target.value)}
                          placeholder="Donations • CRM • Volunteers • Events • Email • Video Meetings • Marketplace • Fundraising"
                          rows={2}
                          className="resize-none"
                        />
                      </FieldGroup>

                      <FieldGroup
                        label="Meta description"
                        htmlFor="page-home-description"
                        counter={charCount(homePage?.description ?? "", 160)}
                      >
                        <Textarea
                          id="page-home-description"
                          value={homePage?.description ?? ""}
                          onChange={(e) => handlePageChange("home", "description", e.target.value)}
                          placeholder="One sentence summary for Google and social previews"
                          rows={3}
                          className="resize-none"
                        />
                      </FieldGroup>

                      <FieldGroup label="Homepage share image">
                        <ImageUpload
                          inputId="seo-page-home-share-image"
                          label=""
                          value={homeSharePreview}
                          onChange={(file) => {
                            if (!file) {
                              handleRemovePageShareImage("home")
                              return
                            }
                            handlePageShareImageChange("home", file)
                          }}
                          processing={processing}
                          maxFileSizeKb={5120}
                        />
                      </FieldGroup>
                    </div>

                    <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
                      <HeroPreview headline={homePage?.title ?? ""} subtitle={homePage?.subtitle ?? ""} />
                      <SerpPreview
                        siteName={data.site_name}
                        title={homePage?.title ?? ""}
                        description={homePage?.description ?? ""}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Global tab */}
            <TabsContent value="global" className="mt-0 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Site-wide defaults</CardTitle>
                  <CardDescription>
                    Applied when a page does not define its own title, description, or share image.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-8 lg:grid-cols-2">
                    <div className="space-y-5">
                      <FieldGroup label="Site name" htmlFor="site_name" hint="Appended to page titles in the browser tab.">
                        <Input
                          id="site_name"
                          value={data.site_name}
                          onChange={(e) => setData("site_name", e.target.value)}
                          placeholder="e.g. Believe In Unity"
                        />
                        {errors.site_name && <p className="text-sm text-red-600">{errors.site_name}</p>}
                      </FieldGroup>

                      <FieldGroup
                        label="Default meta description"
                        htmlFor="default_description"
                        counter={charCount(data.default_description, 160)}
                      >
                        <Textarea
                          id="default_description"
                          value={data.default_description}
                          onChange={(e) => setData("default_description", e.target.value)}
                          placeholder="Fallback description for pages without one"
                          rows={4}
                          className="resize-none"
                        />
                        {errors.default_description && <p className="text-sm text-red-600">{errors.default_description}</p>}
                      </FieldGroup>
                    </div>

                    <div className="space-y-3">
                      <Label className="flex items-center gap-2 text-sm font-medium">
                        <ImageIcon className="h-4 w-4" />
                        Default share image
                      </Label>
                      <ImageUpload
                        inputId="seo-default-share-image"
                        label=""
                        value={defaultSharePreview}
                        onChange={(file) => {
                          setData("default_share_image_file", file)
                          setData("remove_default_share_image", file === null)
                        }}
                        processing={processing}
                        maxFileSizeKb={5120}
                      />
                      <p className="text-xs text-muted-foreground">
                        Recommended <strong>1200×630 px</strong> for Facebook, WhatsApp, LinkedIn, and X cards.
                      </p>
                      {errors.default_share_image_file && (
                        <p className="text-sm text-red-600">{errors.default_share_image_file}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* All pages tab */}
            <TabsContent value="pages" className="mt-0 space-y-4">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <CardTitle>Per-page overrides</CardTitle>
                      <CardDescription className="mt-1">
                        {configuredCount} of {otherPageEntries.length} pages customized. Home is managed on the Homepage tab.
                      </CardDescription>
                    </div>
                    <div className="relative w-full sm:max-w-xs">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Filter pages…"
                        className="pl-9"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {filteredPages.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No pages match your search.</p>
                  ) : (
                    filteredPages.map(([key, label]) => renderPageFields(key, label))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sticky save bar */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <p className="hidden text-sm text-muted-foreground sm:block">
              Unsaved changes are lost if you leave without saving.
            </p>
            <Button type="submit" disabled={processing} className="ml-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <Save className="mr-2 h-4 w-4" />
              {processing ? "Saving…" : "Save SEO settings"}
            </Button>
          </div>
        </div>
      </form>
    </AppLayout>
  )
}
