"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link, useForm } from "@inertiajs/react"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Store, AlertCircle } from "lucide-react"

interface CategoryOption {
  slug: string
  title: string
}

interface SubOption {
  category_slug: string
  slug: string
  name: string
}

interface PageProps {
  categories: CategoryOption[]
  subcategories: SubOption[]
}

export default function KioskProvidersCreate({ categories, subcategories }: PageProps) {
  const defaultCat = categories[0]?.slug ?? ""

  const { data, setData, post, processing, errors } = useForm({
    state: "",
    city: "",
    zip: "",
    category_slug: defaultCat,
    subcategory: "",
    name: "",
    provider_slug: "",
    website: "",
    payment_url: "",
    login_url: "",
    account_link_supported: false,
  })

  const subcategoryHints = useMemo(
    () => subcategories.filter((s) => s.category_slug === data.category_slug),
    [subcategories, data.category_slug],
  )

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post(route("admin.kiosk.providers.store"))
  }

  const listHref = route("admin.kiosk.providers.index")
  const breadcrumbs = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Kiosk Management", href: route("admin.kiosk.index") },
    { title: "Providers", href: listHref },
    { title: "Add provider", href: route("admin.kiosk.providers.create") },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Add kiosk provider" />
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
              Add provider
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Creates a kiosk directory row (same data model as AI ingest and approved requests).
            </p>
          </div>
        </div>

        {categories.length === 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No kiosk categories exist yet. Add categories under Kiosk Management → Categories first.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Provider details</CardTitle>
            <CardDescription>
              City and state are normalized to match the public kiosk (title case city, 2-letter state). Leave subcategory
              blank for &quot;general&quot;.
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
                    placeholder="TX"
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
                    placeholder="Houston"
                    className={errors.city ? "border-destructive" : ""}
                  />
                  {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip">ZIP (optional)</Label>
                <Input
                  id="zip"
                  value={data.zip}
                  onChange={(e) => setData("zip", e.target.value)}
                  placeholder="77002"
                />
                {errors.zip && <p className="text-sm text-destructive">{errors.zip}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_slug">Category *</Label>
                <select
                  id="category_slug"
                  value={data.category_slug}
                  onChange={(e) => setData("category_slug", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={categories.length === 0}
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
                  placeholder="e.g. Electric bill"
                  list="kiosk-subcategory-hints-create"
                />
                <datalist id="kiosk-subcategory-hints-create">
                  {subcategoryHints.map((s) => (
                    <option key={`${s.category_slug}-${s.slug}`} value={s.name} />
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground">Blank becomes &quot;general&quot;.</p>
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
                <Label htmlFor="provider_slug">Provider slug (optional)</Label>
                <Input
                  id="provider_slug"
                  value={data.provider_slug}
                  onChange={(e) => setData("provider_slug", e.target.value)}
                  placeholder="Auto from name if empty"
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
                  placeholder="https://"
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
                  placeholder="https://"
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
                  placeholder="https://"
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
              {errors.account_link_supported && (
                <p className="text-sm text-destructive">{errors.account_link_supported}</p>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" asChild>
                  <Link href={listHref}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={processing || categories.length === 0}>
                  {processing ? "Saving…" : "Create provider"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
