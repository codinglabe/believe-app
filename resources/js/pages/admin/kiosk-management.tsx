"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link, router } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/admin/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Monitor, Trash2, Layers, Plus, Pencil, Search } from "lucide-react"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { useEffect, useRef, useState } from "react"

interface KioskCategoryRow {
  id: number
  slug: string
  title: string
  keywords: string
  redirect_url: string
  sort_order: number
  is_active: boolean
}

interface PageProps {
  categories: KioskCategoryRow[]
  filters?: {
    search?: string
  }
}

export default function KioskManagement({ categories, filters = {} }: PageProps) {
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [search, setSearch] = useState(filters.search ?? "")
  const skipAutoSearchRef = useRef(true)

  useEffect(() => {
    setSearch(filters.search ?? "")
  }, [filters.search])

  const applySearch = () => {
    const params: Record<string, string> = {}
    if (search.trim()) params.search = search.trim()
    router.get(route("admin.kiosk.index"), params, { preserveState: true })
  }

  useEffect(() => {
    if (skipAutoSearchRef.current) {
      skipAutoSearchRef.current = false
      return
    }
    const id = window.setTimeout(() => {
      applySearch()
    }, 400)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const handleToggleActive = (id: number) => {
    setTogglingId(id)
    router.patch(route("admin.kiosk.toggle-active", id), {}, {
      preserveScroll: true,
      onSuccess: () => {
        showSuccessToast("Status updated.")
        setTogglingId(null)
      },
      onError: () => {
        showErrorToast("Failed to update status.")
        setTogglingId(null)
      },
    })
  }

  const handleDelete = (id: number) => {
    router.delete(route("admin.kiosk.destroy", id), {
      preserveScroll: true,
      onSuccess: () => {
        showSuccessToast("Category deleted.")
        setDeleteId(null)
      },
      onError: () => {
        showErrorToast("Failed to delete category.")
        setDeleteId(null)
      },
    })
  }

  const breadcrumbs = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Kiosk Management", href: route("admin.kiosk.index") },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Kiosk Management" />
      <div className="space-y-8 p-4 sm:p-6 w-full">
        {/* Page header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Monitor className="h-8 w-8 text-primary" />
            Kiosk Management
          </h1>
          <p className="text-muted-foreground">
            Manage the public Kiosk page category cards. Set optional redirect URLs and active state per category.
          </p>
        </div>

        {/* Header actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground mb-0">Categories</h2>
            <p className="text-sm text-muted-foreground">
              Edit categories from dedicated pages. Subcategories are managed separately.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] w-full sm:w-auto sm:min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Button asChild>
              <Link href={route("admin.kiosk.categories.create")} className="gap-2">
                <Plus className="h-4 w-4" />
                Create category
              </Link>
            </Button>
          </div>
        </div>

        {!!filters.search && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Showing results for: <span className="font-medium text-foreground">{filters.search}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setSearch("")
                router.get(route("admin.kiosk.index"), {}, { preserveState: true })
              }}
            >
              Clear
            </Button>
          </div>
        )}

        {/* Category list */}
        <div className="space-y-4 pt-2">
          <div>
            <p className="text-sm text-muted-foreground">
              Manage categories.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                onToggleActive={() => handleToggleActive(cat.id)}
                onDelete={() => setDeleteId(cat.id)}
                toggling={togglingId === cat.id}
              />
            ))}
          </div>
          {categories.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground mb-2">No categories yet.</p>
                <p className="text-sm text-muted-foreground">Run: php artisan db:seed --class=KioskCategoriesSeeder</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Delete confirmation */}
        <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete category?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the category from the Kiosk page. You can restore defaults by re-running the Kiosk seeder.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId !== null && handleDelete(deleteId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  )
}

function CategoryCard({
  category,
  onToggleActive,
  onDelete,
  toggling,
}: {
  category: KioskCategoryRow
  onToggleActive: () => void
  onDelete: () => void
  toggling: boolean
}) {
  const slugLabel = category.slug.replace(/-/g, " ")

  return (
    <Card className={`w-full overflow-hidden transition-all ${!category.is_active ? "opacity-75 border-muted" : "border-2"}`}>
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" className="capitalize font-medium">
            {slugLabel}
          </Badge>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {category.is_active ? "Active" : "Inactive"}
            </span>
            <Switch
              checked={category.is_active}
              onCheckedChange={onToggleActive}
              disabled={toggling}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-2">
        <div className="grid gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <p className="font-medium text-foreground truncate">{category.title}</p>
            <span className="text-xs text-muted-foreground tabular-nums">Sort: {category.sort_order}</span>
          </div>

          <div className="text-xs text-muted-foreground">
            <p className="truncate" title={category.keywords || undefined}>
              Keywords: {category.keywords ? category.keywords : "—"}
            </p>
          </div>

          <div className="text-xs text-muted-foreground">
            <p className="truncate" title={category.redirect_url || undefined}>
              Redirect: {category.redirect_url ? category.redirect_url : "—"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 justify-between">
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <Link href={`/admin/kiosk/subcategories?category=${encodeURIComponent(category.slug)}`}>
              <Layers className="h-3.5 w-3.5" />
              Subcategories
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2 ml-auto justify-end">
            <Button variant="secondary" size="sm" asChild className="gap-1.5">
              <Link
                href={route("admin.kiosk.categories.edit", category.id)}
                aria-label="Edit category"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Link>
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
