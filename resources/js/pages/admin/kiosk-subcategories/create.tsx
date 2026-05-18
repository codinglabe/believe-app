"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link, useForm } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Layers, ArrowLeft } from "lucide-react"

interface PageProps {
  category_slug: string
  category_title: string
}

export default function KioskSubcategoriesCreate({ category_slug, category_title }: PageProps) {
  const { data, setData, post, processing, errors } = useForm({
    category_slug,
    name: "",
    sort_order: 0,
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post(route("admin.kiosk.subcategories.store"))
  }

  const indexHref = `${route("admin.kiosk.subcategories.index")}?category=${encodeURIComponent(category_slug)}`

  const breadcrumbs = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Kiosk Management", href: route("admin.kiosk.index") },
    { title: "Subcategories", href: indexHref },
    { title: `Add — ${category_title}`, href: `${route("admin.kiosk.subcategories.create")}?category=${encodeURIComponent(category_slug)}` },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`New subcategory — ${category_title}`} />
      <div className="space-y-6 p-4 sm:p-6 w-full max-w-none min-h-screen">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={indexHref}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Layers className="h-7 w-7 text-primary" />
              New subcategory
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              For category: <span className="font-medium text-foreground">{category_title}</span>
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Subcategory details</CardTitle>
            <CardDescription>
              This subcategory will only appear when creating or editing Kiosk items in the &quot;{category_title}&quot; category.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <input type="hidden" name="category_slug" value={data.category_slug} />

              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Category: </span>
                <span className="font-medium">{category_title}</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={data.name}
                  onChange={(e) => setData("name", e.target.value)}
                  placeholder="e.g. Medicaid (Healthy Louisiana)"
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort_order">Sort order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  min={0}
                  value={data.sort_order}
                  onChange={(e) => setData("sort_order", parseInt(e.target.value, 10) || 0)}
                />
                {errors.sort_order && <p className="text-sm text-destructive">{errors.sort_order}</p>}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" asChild>
                  <Link href={indexHref}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={processing}>
                  {processing ? "Creating..." : "Create subcategory"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
