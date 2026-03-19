"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link, useForm } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/admin/ui/switch"
import { ArrowLeft, Layers, Plus } from "lucide-react"

interface PageProps {
  // no props for now
}

export default function KioskCategoryCreate(_props: PageProps) {
  const { data, setData, post, processing, errors } = useForm({
    slug: "",
    title: "",
    keywords: "",
    redirect_url: "",
    sort_order: 0,
    is_active: true,
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post(route("admin.kiosk.categories.store"))
  }

  const backHref = route("admin.kiosk.index")

  const breadcrumbs = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Kiosk Management", href: backHref },
    { title: "Create", href: route("admin.kiosk.categories.create") },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Create Kiosk Category" />
      <div className="space-y-6 p-4 sm:p-6 w-full max-w-none min-h-screen">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={backHref}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Layers className="h-7 w-7 text-primary" />
              Create category
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Slug must be unique. Redirect URL is optional (path or full URL).
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Category details</CardTitle>
            <CardDescription>
              This category appears on the public Kiosk page when set to active.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={data.title}
                  onChange={(e) => setData("title", e.target.value)}
                  placeholder="e.g. Healthcare"
                  className={errors.title ? "border-destructive" : ""}
                />
                {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={data.slug}
                  onChange={(e) => setData("slug", e.target.value)}
                  placeholder="e.g. healthcare"
                  className={errors.slug ? "border-destructive" : ""}
                />
                {errors.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords</Label>
                <Input
                  id="keywords"
                  value={data.keywords}
                  onChange={(e) => setData("keywords", e.target.value)}
                  placeholder="Item · Another · Third"
                  className={errors.keywords ? "border-destructive" : ""}
                />
                {errors.keywords && <p className="text-sm text-destructive">{errors.keywords}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="redirect_url">Redirect URL</Label>
                <Input
                  id="redirect_url"
                  value={data.redirect_url}
                  onChange={(e) => setData("redirect_url", e.target.value)}
                  placeholder="/contact or https://..."
                  className={errors.redirect_url ? "border-destructive" : ""}
                />
                {errors.redirect_url && <p className="text-sm text-destructive">{errors.redirect_url}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="sort_order">Sort order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    min={0}
                    value={data.sort_order}
                    onChange={(e) => setData("sort_order", parseInt(e.target.value, 10) || 0)}
                    className={errors.sort_order ? "border-destructive" : ""}
                  />
                  {errors.sort_order && <p className="text-sm text-destructive">{errors.sort_order}</p>}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="is_active">Status</Label>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch
                      id="is_active"
                      checked={data.is_active}
                      onCheckedChange={(v) => setData("is_active", v)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {data.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {errors.is_active && <p className="text-sm text-destructive">{errors.is_active}</p>}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-4">
                <Button type="button" variant="outline" asChild>
                  <Link href={backHref}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={processing} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {processing ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

