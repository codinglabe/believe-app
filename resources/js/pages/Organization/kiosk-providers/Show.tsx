"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link, router } from "@inertiajs/react"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { ArrowLeft, Globe, CreditCard, LogIn, MapPin, Monitor, Pencil, Trash2 } from "lucide-react"
import type { BreadcrumbItem } from "@/types"
import type { PageProps as InertiaPageProps } from "@inertiajs/core"
import { showSuccessToast } from "@/lib/toast"

interface ProviderDetail {
  id: number
  organization_id: number | null
  state_abbr: string
  normalized_city: string
  zip_normalized: string
  category_slug: string
  category_title: string
  subcategory_slug: string
  provider_slug: string
  name: string
  website: string | null
  payment_url: string | null
  login_url: string | null
  account_link_supported: boolean
  updated_at: string | null
  is_platform: boolean
}

interface KioskProviderShowProps extends InertiaPageProps {
  current_organization_id: number
  provider: ProviderDetail
  success?: string | null
}

export default function OrganizationKioskProviderShow({ current_organization_id, provider, success }: KioskProviderShowProps) {
  const listHref = route("organization.kiosk-providers.index")
  const canEdit = provider.organization_id != null && provider.organization_id === current_organization_id

  useEffect(() => {
    if (success) {
      showSuccessToast(success)
    }
  }, [success])

  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Community kiosk", href: listHref },
    { title: provider.name, href: route("organization.kiosk-providers.show", provider.id) },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`${provider.name} — Kiosk listing`} />
      <div className="space-y-6 p-4 sm:p-6 w-full max-w-3xl mx-auto">
        <div className="flex items-start gap-3 sm:justify-between">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <Button variant="ghost" size="icon" className="shrink-0 mt-0.5" asChild>
              <Link href={listHref}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 flex-wrap">
                <Monitor className="h-7 w-7 text-primary shrink-0" />
                <span className="break-words">{provider.name}</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {provider.normalized_city}, {provider.state_abbr}
                {provider.zip_normalized ? ` ${provider.zip_normalized}` : ""}
              </p>
            </div>
          </div>
          {canEdit && (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <Link href={route("organization.kiosk-providers.edit", provider.id)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Remove
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
            </div>
          )}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Details</CardTitle>
            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              {provider.organization_id != null && provider.organization_id === current_organization_id ? (
                <Badge className="text-xs font-normal">Yours</Badge>
              ) : provider.is_platform ? (
                <Badge variant="secondary" className="text-xs font-normal">
                  Platform
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs font-normal">
                  Organization
                </Badge>
              )}
              <Badge variant="outline" className="text-xs font-normal">
                {provider.category_title}
              </Badge>
              {provider.subcategory_slug !== "general" && (
                <Badge variant="outline" className="text-xs font-normal">
                  {provider.subcategory_slug}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {(provider.website || provider.payment_url || provider.login_url) && (
              <div className="flex flex-wrap gap-2">
                {provider.website && (
                  <Button variant="outline" size="sm" className="h-9 gap-1.5" asChild>
                    <a href={provider.website} target="_blank" rel="noreferrer" className="inline-flex items-center">
                      <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      Website
                    </a>
                  </Button>
                )}
                {provider.payment_url && (
                  <Button variant="outline" size="sm" className="h-9 gap-1.5" asChild>
                    <a href={provider.payment_url} target="_blank" rel="noreferrer" className="inline-flex items-center">
                      <CreditCard className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      Payment
                    </a>
                  </Button>
                )}
                {provider.login_url && (
                  <Button variant="outline" size="sm" className="h-9 gap-1.5" asChild>
                    <a href={provider.login_url} target="_blank" rel="noreferrer" className="inline-flex items-center">
                      <LogIn className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      Login
                    </a>
                  </Button>
                )}
              </div>
            )}
            {provider.account_link_supported && (
              <p className="text-muted-foreground">Account link supported for this listing.</p>
            )}
            {!provider.website && !provider.payment_url && !provider.login_url && (
              <p className="text-muted-foreground">No external links are recorded for this listing.</p>
            )}
            {provider.updated_at && (
              <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                Last updated{" "}
                {new Date(provider.updated_at).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
