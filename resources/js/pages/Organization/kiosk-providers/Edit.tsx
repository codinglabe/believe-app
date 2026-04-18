"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link, router, useForm } from "@inertiajs/react"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Monitor, AlertCircle, Trash2 } from "lucide-react"
import type { BreadcrumbItem } from "@/types"

interface CategoryOption {
  slug: string
  title: string
}

interface SubOption {
  category_slug: string
  slug: string
  name: string
}

interface ProviderForm {
  id: number
  state: string
  city: string
  zip: string
  category_slug: string
  subcategory: string
  name: string
  website: string
  payment_url: string
  login_url: string
  account_link_supported: boolean
}

interface PageProps {
  categories: CategoryOption[]
  subcategories: SubOption[]
  provider: ProviderForm
}

export default function OrganizationKioskProvidersEdit({ categories, subcategories, provider }: PageProps) {
  const { data, setData, put, processing, errors } = useForm({
    state: provider.state,
    city: provider.city,
    zip: provider.zip,
    category_slug: provider.category_slug,
    subcategory: provider.subcategory,
    name: provider.name,
    website: provider.website,
    payment_url: provider.payment_url,
    login_url: provider.login_url,
    account_link_supported: provider.account_link_supported,
  })

  const subcategoryHints = useMemo(
    () => subcategories.filter((s) => s.category_slug === data.category_slug),
    [subcategories, data.category_slug],
  )

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    put(route("organization.kiosk-providers.update", provider.id))
  }

  const listHref = route("organization.kiosk-providers.index")
  const showHref = route("organization.kiosk-providers.show", provider.id)

  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Community kiosk", href: listHref },
    { title: provider.name, href: showHref },
    { title: "Edit", href: route("organization.kiosk-providers.edit", provider.id) },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`Edit — ${provider.name}`} />
      <div className="space-y-6 p-4 sm:p-6 w-full max-w-none min-h-screen">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={showHref}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Monitor className="h-7 w-7 text-primary" />
              Edit listing
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Update or remove this listing. Only entries your organization added can be changed here.
            </p>
          </div>
        </div>

        {categories.length === 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No kiosk categories are configured yet. Contact support if this persists.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Listing details</CardTitle>
            <CardDescription>
              City and state are normalized to match the public kiosk (title case city, 2-letter state). Leave subcategory
              blank for &quot;general&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="w-full max-w-none space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-state">State *</Label>
                  <Input
                    id="edit-state"
                    maxLength={2}
                    value={data.state}
                    onChange={(e) => setData("state", e.target.value.toUpperCase())}
                    placeholder="TX"
                    className={errors.state ? "border-destructive" : ""}
                  />
                  {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-city">City *</Label>
                  <Input
                    id="edit-city"
                    value={data.city}
                    onChange={(e) => setData("city", e.target.value)}
                    placeholder="Houston"
                    className={errors.city ? "border-destructive" : ""}
                  />
                  {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-zip">ZIP (optional)</Label>
                <Input
                  id="edit-zip"
                  value={data.zip}
                  onChange={(e) => setData("zip", e.target.value)}
                  placeholder="77002"
                />
                {errors.zip && <p className="text-sm text-destructive">{errors.zip}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-category_slug">Category *</Label>
                <select
                  id="edit-category_slug"
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
                <Label htmlFor="edit-subcategory">Subcategory (optional)</Label>
                <Input
                  id="edit-subcategory"
                  value={data.subcategory}
                  onChange={(e) => setData("subcategory", e.target.value)}
                  placeholder="e.g. Electric bill"
                  list="kiosk-subcategory-hints-org-edit"
                />
                <datalist id="kiosk-subcategory-hints-org-edit">
                  {subcategoryHints.map((s) => (
                    <option key={`${s.category_slug}-${s.slug}`} value={s.name} />
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground">Blank becomes &quot;general&quot;.</p>
                {errors.subcategory && <p className="text-sm text-destructive">{errors.subcategory}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-name">Display name *</Label>
                <Input
                  id="edit-name"
                  value={data.name}
                  onChange={(e) => setData("name", e.target.value)}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-website">Website</Label>
                <Input
                  id="edit-website"
                  type="url"
                  value={data.website}
                  onChange={(e) => setData("website", e.target.value)}
                  placeholder="https://"
                />
                {errors.website && <p className="text-sm text-destructive">{errors.website}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-payment_url">Payment URL</Label>
                <Input
                  id="edit-payment_url"
                  type="url"
                  value={data.payment_url}
                  onChange={(e) => setData("payment_url", e.target.value)}
                  placeholder="https://"
                />
                {errors.payment_url && <p className="text-sm text-destructive">{errors.payment_url}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-login_url">Login URL</Label>
                <Input
                  id="edit-login_url"
                  type="url"
                  value={data.login_url}
                  onChange={(e) => setData("login_url", e.target.value)}
                  placeholder="https://"
                />
                {errors.login_url && <p className="text-sm text-destructive">{errors.login_url}</p>}
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-account_link_supported"
                  checked={data.account_link_supported}
                  onCheckedChange={(v) => setData("account_link_supported", v === true)}
                />
                <Label htmlFor="edit-account_link_supported">Account link supported</Label>
              </div>
              {errors.account_link_supported && (
                <p className="text-sm text-destructive">{errors.account_link_supported}</p>
              )}

              <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline" className="text-destructive hover:text-destructive w-full sm:w-auto">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove listing
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove this listing?</AlertDialogTitle>
                      <AlertDialogDescription>
                        &quot;{provider.name}&quot; will be removed from the kiosk directory. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() =>
                          router.delete(route("organization.kiosk-providers.destroy", provider.id))
                        }
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <div className="flex justify-end gap-3 w-full sm:w-auto">
                  <Button type="button" variant="outline" asChild>
                    <Link href={showHref}>Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={processing || categories.length === 0}>
                    {processing ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
