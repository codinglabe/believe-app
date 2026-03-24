"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link, useForm } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/admin/ui/switch"
import { List, ArrowLeft } from "lucide-react"

interface ItemData {
  id: number
  display_name: string
  category_slug: string
  subcategory: string | null
  url: string | null
  is_active: boolean
  market_code: string | null
  state: string | null
  city: string | null
  service_slug: string
}

interface SubcategoryOption {
  category_slug: string
  name: string
}

interface PageProps {
  item: ItemData
  categories: { value: string; label: string }[]
  subcategories: SubcategoryOption[]
  usStates: { value: string; label: string }[]
}

const OTHER_VALUE = "__other__"

function getInitialSubcategory(subcategory: string | null, subcategoriesForCategory: SubcategoryOption[]) {
  if (!subcategory?.trim()) return { subcategory: "", subcategory_other: "" }
  const inList = subcategoriesForCategory.some((s) => s.name === subcategory)
  return inList ? { subcategory, subcategory_other: "" } : { subcategory: OTHER_VALUE, subcategory_other: subcategory }
}

export default function KioskItemsEdit({ item, categories, subcategories, usStates = [] }: PageProps) {
  const subcategoriesForInitialCategory = subcategories.filter((s) => s.category_slug === item.category_slug)
  const initial = getInitialSubcategory(item.subcategory ?? null, subcategoriesForInitialCategory)

  const { data, setData, put, processing, errors } = useForm({
    display_name: item.display_name,
    category_slug: item.category_slug,
    subcategory: initial.subcategory,
    subcategory_other: initial.subcategory_other,
    url: item.url ?? "",
    is_active: item.is_active,
    market_code: item.market_code ?? "",
    state: item.state ?? "",
    city: item.city ?? "",
  })

  const subcategoriesForCategory = subcategories.filter((s) => s.category_slug === data.category_slug)
  const isOther = data.subcategory === OTHER_VALUE
  const effectiveSubcategory = isOther ? data.subcategory_other : data.subcategory

  const stateInList = data.state && usStates.some((s) => s.value === data.state)
  const stateSelectValue = stateInList || !data.state ? (data.state ?? "") : "__legacy__"

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const { subcategory_other: _o, ...rest } = data
    put(route("admin.kiosk.items.update", item.id), {
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
    { title: "Edit", href: route("admin.kiosk.items.edit", item.id) },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`Edit: ${item.display_name}`} />
      <div className="space-y-6 p-4 sm:p-6 w-full max-w-none min-h-screen">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={route("admin.kiosk.items.index")}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <List className="h-7 w-7 text-primary" />
              Edit Kiosk Item
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Slug: {item.service_slug}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Item details</CardTitle>
            <CardDescription>Changes will appear on the public Kiosk services page.</CardDescription>
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
                  value={
                    data.subcategory === OTHER_VALUE
                      ? OTHER_VALUE
                      : subcategoriesForCategory.some((s) => s.name === data.subcategory)
                        ? data.subcategory
                        : data.subcategory?.trim()
                          ? OTHER_VALUE
                          : ""
                  }
                  onChange={(e) => setData("subcategory", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9"
                >
                  <option value="">— None —</option>
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <select
                    id="state"
                    value={stateSelectValue}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === "__legacy__") return
                      setData("state", v)
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9"
                  >
                    <option value="">— None —</option>
                    {!stateInList && data.state ? (
                      <option value="__legacy__" disabled>
                        Current: {data.state} (pick a US state below to replace)
                      </option>
                    ) : null}
                    {usStates.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  {usStates.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Run <code className="rounded bg-muted px-1">php artisan db:seed --class=UsStatesSeeder</code> for the
                      state list.
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
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" asChild>
                  <Link href={route("admin.kiosk.items.index")}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={processing}>
                  {processing ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
