"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link, router } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Layers, Plus, Pencil, Trash2, Search, ArrowLeft, LayoutGrid } from "lucide-react"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { useState, useEffect, useRef } from "react"

interface CategoryPickerRow {
  slug: string
  title: string
  subcategory_count: number
}

interface SubcategoryRow {
  id: number
  name: string
  category_slug: string
  category_title: string
  sort_order: number
}

interface PaginationLink {
  url: string | null
  label: string
  active: boolean
}

interface PaginatedSubcategories {
  data: SubcategoryRow[]
  current_page: number
  last_page: number
  total: number
  links: PaginationLink[]
  prev_page_url: string | null
  next_page_url: string | null
}

interface SelectedCategory {
  slug: string
  title: string
}

interface PagePropsPick {
  pickCategory: true
  categoriesForPicker: CategoryPickerRow[]
  subcategories: null
  selectedCategory: null
  filters: { search?: string | null; category?: string | null }
}

interface PagePropsList {
  pickCategory: false
  categoriesForPicker: CategoryPickerRow[]
  subcategories: PaginatedSubcategories
  selectedCategory: SelectedCategory
  filters: { search?: string | null; category?: string | null }
}

type PageProps = PagePropsPick | PagePropsList

export default function KioskSubcategoriesIndex(props: PageProps) {
  const { pickCategory, categoriesForPicker } = props
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [search, setSearch] = useState(props.pickCategory ? "" : props.filters.search ?? "")
  const selectedCategorySlug =
    !pickCategory && "selectedCategory" in props && props.selectedCategory
      ? props.selectedCategory.slug
      : null
  const categorySlug = selectedCategorySlug ?? ""

  const searchFromFilter = !pickCategory ? props.filters.search ?? "" : ""
  useEffect(() => {
    if (!pickCategory) setSearch(searchFromFilter)
  }, [pickCategory, searchFromFilter])

  const skipSubcatAutoSearchRef = useRef(true)
  const lastSubcatCategorySlug = useRef<string | null>(null)

  useEffect(() => {
    if (pickCategory || !selectedCategorySlug) return
    const slug = selectedCategorySlug
    if (lastSubcatCategorySlug.current !== slug) {
      lastSubcatCategorySlug.current = slug
      skipSubcatAutoSearchRef.current = true
    }
    if (skipSubcatAutoSearchRef.current) {
      skipSubcatAutoSearchRef.current = false
      return
    }
    const id = window.setTimeout(() => {
      const params: Record<string, string> = { category: slug }
      if (search.trim()) params.search = search.trim()
      router.get(route("admin.kiosk.subcategories.index"), params, {
        preserveState: true,
        replace: true,
      })
    }, 400)
    return () => window.clearTimeout(id)
  }, [search, pickCategory, selectedCategorySlug])

  const handleDelete = (id: number) => {
    router.delete(route("admin.kiosk.subcategories.destroy", id), {
      preserveScroll: true,
      onSuccess: () => {
        showSuccessToast("Subcategory deleted.")
        setDeleteId(null)
      },
      onError: () => {
        showErrorToast("Failed to delete.")
        setDeleteId(null)
      },
    })
  }

  const breadcrumbs = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Kiosk Management", href: route("admin.kiosk.index") },
    { title: "Subcategories", href: route("admin.kiosk.subcategories.index") },
  ]

  const createUrl = `${route("admin.kiosk.subcategories.create")}?category=${encodeURIComponent(categorySlug)}`

  if (pickCategory) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <Head title="Kiosk Subcategories — choose category" />
        <div className="space-y-6 p-4 sm:p-6 w-full min-h-screen max-w-none">
          <div className="flex flex-wrap items-center gap-3 border-b border-border pb-4 -mt-1">
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <Link href={route("admin.kiosk.index")}>
                <ArrowLeft className="h-4 w-4" />
                Back to Kiosk categories
              </Link>
            </Button>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Layers className="h-7 w-7 text-primary" />
              Subcategories by category
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Subcategories belong to one Kiosk category. Pick a category to view and add subcategories for that category only.
            </p>
          </div>

          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {categoriesForPicker.map((c) => (
              <Link
                key={c.slug}
                href={`${route("admin.kiosk.subcategories.index")}?category=${encodeURIComponent(c.slug)}`}
                className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50 hover:border-primary/30"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <LayoutGrid className="h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{c.slug.replace(/-/g, " ")}</p>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground shrink-0 ml-2">
                  {c.subcategory_count} sub{c.subcategory_count === 1 ? "" : "s"}
                </span>
              </Link>
            ))}
          </div>

          {categoriesForPicker.length === 0 && (
            <p className="text-muted-foreground text-sm">No categories found. Add categories under Kiosk Management first.</p>
          )}
        </div>
      </AppLayout>
    )
  }

  const { subcategories, selectedCategory } = props

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`Subcategories — ${selectedCategory.title}`} />
      <div className="space-y-6 p-4 sm:p-6 w-full min-h-screen max-w-none">
        <div className="flex flex-wrap items-center gap-3 border-b border-border pb-4 -mt-1">
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <Link href={route("admin.kiosk.subcategories.index")}>
              <ArrowLeft className="h-4 w-4" />
              Back to category list
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" asChild>
            <Link href={route("admin.kiosk.index")}>
              Kiosk categories
            </Link>
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Layers className="h-7 w-7 text-primary" />
              Subcategories
            </h1>
            <p className="text-muted-foreground text-sm">
              Category: <span className="font-medium text-foreground">{selectedCategory.title}</span>
            </p>
          </div>
          <Button asChild>
            <Link href={createUrl} className="gap-2">
              <Plus className="h-4 w-4" />
              Add subcategory for this category
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full">
          <div className="relative flex-1 min-w-[200px] max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Search subcategories"
            />
          </div>
        </div>

        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left font-medium p-3">Name</th>
                  <th className="text-left font-medium p-3">Sort order</th>
                  <th className="text-right font-medium p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subcategories.data.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-muted-foreground">
                      No subcategories for this category yet.{" "}
                      <Link href={createUrl} className="text-primary hover:underline">
                        Create one
                      </Link>
                      .
                    </td>
                  </tr>
                ) : (
                  subcategories.data.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{row.name}</td>
                      <td className="p-3 text-muted-foreground">{row.sort_order}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={route("admin.kiosk.subcategories.edit", row.id)} aria-label="Edit">
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(row.id)}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {subcategories.last_page > 1 && (
            <div className="flex items-center justify-between gap-4 p-3 border-t">
              <p className="text-xs text-muted-foreground">
                Page {subcategories.current_page} of {subcategories.last_page} ({subcategories.total} total)
              </p>
              <div className="flex gap-2">
                {subcategories.prev_page_url && (
                  <Link href={subcategories.prev_page_url}>
                    <Button variant="outline" size="sm">Previous</Button>
                  </Link>
                )}
                {subcategories.next_page_url && (
                  <Link href={subcategories.next_page_url}>
                    <Button variant="outline" size="sm">Next</Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this subcategory?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the subcategory from the list. Kiosk items that used this subcategory will keep their stored subcategory text. This action cannot be undone.
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
