"use client"

import React, { useEffect } from "react"
import { Head, useForm } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Save, Search } from "lucide-react"
import type { BreadcrumbItem } from "@/types"

interface PageSeo {
  title: string
  description: string
}

interface SeoSettings {
  site_name: string
  default_description: string
  default_share_image: string
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

export default function AdminSeoIndex({ settings, pageKeys }: AdminSeoIndexProps) {
  const pageKeyEntries = Object.entries(pageKeys)

  const { data, setData, put, processing, errors } = useForm({
    site_name: settings.site_name || "",
    default_description: settings.default_description || "",
    default_share_image: settings.default_share_image || "",
    pages: settings.pages || {},
  })

  const handlePageChange = (key: string, field: "title" | "description", value: string) => {
    setData("pages", {
      ...data.pages,
      [key]: {
        ...(data.pages[key] || { title: "", description: "" }),
        [field]: value,
      },
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    put(route("admin.seo.update"))
  }

  // Ensure all page keys exist in data.pages on mount
  useEffect(() => {
    let updated = false
    const nextPages = { ...data.pages }
    pageKeyEntries.forEach(([key]) => {
      if (!nextPages[key]) {
        nextPages[key] = { title: "", description: "" }
        updated = true
      }
    })
    if (updated) {
      setData("pages", nextPages)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="SEO Settings - System Management" />
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">SEO Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1.5">
            Manage default meta titles and descriptions for all public pages. These values are used for search engines and social sharing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Global defaults</CardTitle>
              <CardDescription>
                Site name is used in page titles (e.g. &quot;Home | Site Name&quot;). Default description is used when a page has no custom description. Default share image is used when links are shared on Facebook, WhatsApp, etc.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="site_name">Site name</Label>
                <Input
                  id="site_name"
                  value={data.site_name}
                  onChange={(e) => setData("site_name", e.target.value)}
                  placeholder="e.g. Believe In Unity"
                  className="max-w-md"
                />
                {errors.site_name && <p className="text-sm text-red-600">{errors.site_name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_description">Default meta description</Label>
                <Textarea
                  id="default_description"
                  value={data.default_description}
                  onChange={(e) => setData("default_description", e.target.value)}
                  placeholder="Short default description for pages without one"
                  rows={3}
                  className="max-w-2xl"
                />
                {errors.default_description && <p className="text-sm text-red-600">{errors.default_description}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_share_image">Default share image URL</Label>
                <Input
                  id="default_share_image"
                  type="url"
                  value={data.default_share_image}
                  onChange={(e) => setData("default_share_image", e.target.value)}
                  placeholder="https://yoursite.com/images/og-default.png or /images/og-default.png"
                  className="max-w-2xl"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Absolute or relative URL. Shown when links are shared on Facebook, WhatsApp, Twitter, etc. Recommended: 1200×630 px.
                </p>
                {errors.default_share_image && <p className="text-sm text-red-600">{errors.default_share_image}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Per-page SEO</CardTitle>
              <CardDescription>
                Override title and meta description for each public page. Leave blank to use defaults.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pageKeyEntries.map(([key, label]) => (
                  <div
                    key={key}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3 bg-gray-50/50 dark:bg-gray-800/30"
                  >
                    <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <Search className="h-4 w-4 text-gray-500" />
                      {label}
                      <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({key})</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-1">
                      <div className="space-y-1.5">
                        <Label htmlFor={`page-${key}-title`} className="text-sm">Title</Label>
                        <Input
                          id={`page-${key}-title`}
                          value={data.pages[key]?.title ?? ""}
                          onChange={(e) => handlePageChange(key, "title", e.target.value)}
                          placeholder={`e.g. ${label}`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`page-${key}-description`} className="text-sm">Meta description</Label>
                        <Textarea
                          id={`page-${key}-description`}
                          value={data.pages[key]?.description ?? ""}
                          onChange={(e) => handlePageChange(key, "description", e.target.value)}
                          placeholder="Short description for search results (recommended 150–160 characters)"
                          rows={2}
                          className="resize-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={processing}>
              <Save className="h-4 w-4 mr-2" />
              {processing ? "Saving…" : "Save SEO settings"}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
