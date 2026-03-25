"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link, useForm } from "@inertiajs/react"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Store } from "lucide-react"

interface CategoryOption {
  slug: string
  title: string
}

interface SubOption {
  category_slug: string
  slug: string
  name: string
}

interface ProviderRow {
  id: number
  state_abbr: string
  normalized_city: string
  zip_normalized: string
  category_slug: string
  subcategory_slug: string
  provider_slug: string
  name: string
  website: string | null
  payment_url: string | null
  login_url: string | null
  account_link_supported: boolean
}

interface PageProps {
  provider: ProviderRow
  categories: CategoryOption[]
  subcategories: SubOption[]
}

function subcategoryLabel(provider: ProviderRow, subcategories: SubOption[]): string {
  if (provider.subcategory_slug === "general") {
    return ""
  }
  const m = subcategories.find(
    (s) => s.category_slug === provider.category_slug && s.slug === provider.subcategory_slug,
  )
  return m?.name ?? provider.subcategory_slug.replace(/-/g, " ")
}

export default function KioskProvidersEdit({ provider, categories, subcategories }: PageProps) {
  const { data, setData, put, processing, errors } = useForm({
    state: provider.state_abbr,
    city: provider.normalized_city,
    zip: provider.zip_normalized || "",
    category_slug: provider.category_slug,
    subcategory: subcategoryLabel(provider, subcategories),
    name: provider.name,
    provider_slug: provider.provider_slug,
    website: provider.website || "",
    payment_url: provider.payment_url || "",
    login_url: provider.login_url || "",
    account_link_supported: provider.account_link_supported,
  })

  const subcategoryHints = useMemo(
    () => subcategories.filter((s) => s.category_slug === data.category_slug),
    [subcategories, data.category_slug],
  )

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    put(route("admin.kiosk.providers.update", provider.id))
  }

  const listHref = route("admin.kiosk.providers.index")
  const breadcrumbs = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Kiosk Management", href: route("admin.kiosk.index") },
    { title: "Providers", href: listHref },
    { title: `Edit — ${provider.name}`, href: route("admin.kiosk.providers.edit", provider.id) },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`Edit — ${provider.name}`} />
      <div className="space-y-6 p-4 sm:p-6 w-full max-w-none min-h-screen">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={listHref}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Store className="h-7 w-7 text-primary" />
              Edit provider
            </h1>
            <p className="text-muted-foreground text-sm mt-1">ID {provider.id}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Provider details</CardTitle>
            <CardDescription>
              Changing location or slugs may affect deduplication. Provider slug must stay unique within the same
              city/state/zip/category/subcategory.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="w-full max-w-none space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    maxLength={2}
                    value={data.state}
                    onChange={(e) => setData("state", e.target.value.toUpperCase())}
                    className={errors.state ? "border-destructive" : ""}
                  />
                  {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={data.city}
                    onChange={(e) => setData("city", e.target.value)}
                    className={errors.city ? "border-destructive" : ""}
                  />
                  {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip">ZIP (optional)</Label>
                <Input id="zip" value={data.zip} onChange={(e) => setData("zip", e.target.value)} />
                {errors.zip && <p className="text-sm text-destructive">{errors.zip}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_slug">Category *</Label>
                <select
                  id="category_slug"
                  value={data.category_slug}
                  onChange={(e) => setData("category_slug", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  aria-label="Category"
                >
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.title}
                    </option>
                  ))}
                </select>
                {errors.category_slug && <p className="text-sm text-destructive">{errors.category_slug}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategory (optional)</Label>
                <Input
                  id="subcategory"
                  value={data.subcategory}
                  onChange={(e) => setData("subcategory", e.target.value)}
                  list="kiosk-subcategory-hints-edit"
                />
                <datalist id="kiosk-subcategory-hints-edit">
                  {subcategoryHints.map((s) => (
                    <option key={`${s.category_slug}-${s.slug}`} value={s.name} />
                  ))}
                </datalist>
                {errors.subcategory && <p className="text-sm text-destructive">{errors.subcategory}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Display name *</Label>
                <Input
                  id="name"
                  value={data.name}
                  onChange={(e) => setData("name", e.target.value)}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider_slug">Provider slug *</Label>
                <Input
                  id="provider_slug"
                  value={data.provider_slug}
                  onChange={(e) => setData("provider_slug", e.target.value)}
                  className={errors.provider_slug ? "border-destructive" : ""}
                />
                {errors.provider_slug && <p className="text-sm text-destructive">{errors.provider_slug}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={data.website}
                  onChange={(e) => setData("website", e.target.value)}
                />
                {errors.website && <p className="text-sm text-destructive">{errors.website}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_url">Payment URL</Label>
                <Input
                  id="payment_url"
                  type="url"
                  value={data.payment_url}
                  onChange={(e) => setData("payment_url", e.target.value)}
                />
                {errors.payment_url && <p className="text-sm text-destructive">{errors.payment_url}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="login_url">Login URL</Label>
                <Input
                  id="login_url"
                  type="url"
                  value={data.login_url}
                  onChange={(e) => setData("login_url", e.target.value)}
                />
                {errors.login_url && <p className="text-sm text-destructive">{errors.login_url}</p>}
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="account_link_supported"
                  checked={data.account_link_supported}
                  onCheckedChange={(v) => setData("account_link_supported", v === true)}
                />
                <Label htmlFor="account_link_supported">Account link supported</Label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" asChild>
                  <Link href={listHref}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={processing}>
                  {processing ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
