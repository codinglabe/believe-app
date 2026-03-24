"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link, useForm } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/admin/ui/switch"
import { List, ArrowLeft } from "lucide-react"

interface SubcategoryOption {
  category_slug: string
  name: string
}

interface PageProps {
  categories: { value: string; label: string }[]
  subcategories: SubcategoryOption[]
  /** US states from `states` table (abbr = value); empty until migration + UsStatesSeeder */
  usStates: { value: string; label: string }[]
}

const OTHER_VALUE = "__other__"

export default function KioskItemsCreate({ categories, subcategories, usStates = [] }: PageProps) {
  const { data, setData, post, processing, errors } = useForm({
    display_name: "",
    category_slug: categories.length > 0 ? categories[0].value : "",
    subcategory: "",
    subcategory_other: "",
    url: "",
    is_active: true,
    market_code: "",
    state: "",
    city: "",
  })

  const subcategoriesForCategory = subcategories.filter((s) => s.category_slug === data.category_slug)
  const isOther = data.subcategory === OTHER_VALUE
  const effectiveSubcategory = isOther ? data.subcategory_other : data.subcategory
  const subcategorySelectValue =
    subcategoriesForCategory.some((s) => s.name === data.subcategory)
      ? data.subcategory
      : data.subcategory?.trim()
        ? OTHER_VALUE
        : ""

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const { subcategory_other: _o, ...rest } = data
    post(route("admin.kiosk.items.store"), {
      transform: () => ({
        ...rest,
        subcategory: effectiveSubcategory?.trim() || "",
      }),
    })
  }

  const breadcrumbs = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Kiosk Management", href: route("admin.kiosk.index") },
    { title: "Kiosk Items", href: route("admin.kiosk.items.index") },
    { title: "Create", href: route("admin.kiosk.items.create") },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Create Kiosk Item" />
      <div className="space-y-6 p-4 sm:p-6 w-full max-w-none min-h-screen">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={route("admin.kiosk.items.index")}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <List className="h-7 w-7 text-primary" />
              Create Kiosk Item
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Add a new service item to the Kiosk.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Item details</CardTitle>
            <CardDescription>This item will appear on the public Kiosk services page when the category is selected.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">Display name *</Label>
                <Input
                  id="display_name"
                  value={data.display_name}
                  onChange={(e) => setData("display_name", e.target.value)}
                  placeholder="e.g. Medicaid (Healthy Louisiana)"
                  className={errors.display_name ? "border-destructive" : ""}
                />
                {errors.display_name && <p className="text-sm text-destructive">{errors.display_name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_slug">Category *</Label>
                <select
                  id="category_slug"
                  value={data.category_slug}
                  onChange={(e) => setData("category_slug", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9"
                >
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                {errors.category_slug && <p className="text-sm text-destructive">{errors.category_slug}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategory</Label>
                <select
                  id="subcategory"
                  value={subcategorySelectValue}
                  onChange={(e) => setData("subcategory", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9"
                >
                  <option value="">None</option>
                  {subcategoriesForCategory.map((s) => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                  <option value={OTHER_VALUE}>Other (type below)</option>
                </select>
                {isOther && (
                  <Input
                    value={data.subcategory_other}
                    onChange={(e) => setData("subcategory_other", e.target.value)}
                    placeholder="Enter subcategory name"
                    className="mt-2"
                  />
                )}
                {errors.subcategory && <p className="text-sm text-destructive">{errors.subcategory}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={data.url}
                  onChange={(e) => setData("url", e.target.value)}
                  placeholder="https://..."
                />
                {errors.url && <p className="text-sm text-destructive">{errors.url}</p>}
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={data.is_active}
                  onCheckedChange={(v) => setData("is_active", v)}
                />
                <Label htmlFor="is_active">Active (show on public page)</Label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="market_code">Market code</Label>
                  <Input
                    id="market_code"
                    value={data.market_code}
                    onChange={(e) => setData("market_code", e.target.value)}
                    placeholder="e.g. LA-IBERIA"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <select
                    id="state"
                    value={data.state}
                    onChange={(e) => setData("state", e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9"
                  >
                    <option value="">— None —</option>
                    {usStates.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  {usStates.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No US states in the database. Run migrations and{" "}
                      <code className="rounded bg-muted px-1">php artisan db:seed --class=UsStatesSeeder</code>.
                    </p>
                  ) : null}
                  {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={data.city}
                    onChange={(e) => setData("city", e.target.value)}
                    placeholder="Jeanerette"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" asChild>
                  <Link href={route("admin.kiosk.items.index")}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={processing}>
                  {processing ? "Creating..." : "Create item"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
