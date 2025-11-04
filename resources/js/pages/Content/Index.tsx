"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Head, Link, router, usePage } from "@inertiajs/react"
import type { PageProps, ContentItem } from "@/types"
import AppLayout from "@/layouts/app-layout"
import { FileText, Search, Filter, X, Plus, Heart, BookOpen, Sparkles, Edit, Trash2, Calendar, User, Tag as TagIcon } from "lucide-react"

interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  from: number
  last_page: number
  links: Array<{
    url: string | null
    label: string
    active: boolean
  }>
  path: string
  per_page: number
  to: number
  total: number
}

interface ContentIndexProps {
  contentItems: PaginatedResponse<ContentItem>
  filters?: {
    search?: string
    type?: string
  }
}

const ContentIndex: React.FC<ContentIndexProps> = ({ contentItems, filters }) => {
  const { flash } = usePage<PageProps>().props
  const safeFilters = filters || {}

  const [search, setSearch] = useState(safeFilters.search || "")
  const [typeFilter, setTypeFilter] = useState(safeFilters.type || "all")
  const [currentPage, setCurrentPage] = useState(contentItems?.current_page || 1)

  useEffect(() => {
    const timer = setTimeout(() => {
        setCurrentPage(1) // Reset to page 1 when filters change
      router.get(
        route("content.items.index"),
        {
          search: search || undefined,
          type: typeFilter !== "all" ? typeFilter : undefined,
          page: currentPage || 1,
        },
        {
          preserveState: true,
          replace: true,
        },
      )
    }, 500)

    return () => clearTimeout(timer)
  }, [search, typeFilter])

  const clearFilters = () => {
    setSearch("")
    setTypeFilter("all")
    setCurrentPage(1)
    router.get(route("content.items.index"), {}, { preserveState: true })
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "prayer":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
      case "devotional":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      case "scripture":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "prayer":
        return <Heart className="w-4 h-4" />
      case "devotional":
        return <BookOpen className="w-4 h-4" />
      case "scripture":
        return <Sparkles className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const hasActiveFilters = search || typeFilter !== "all"

  const safeContentItems = contentItems || {
    data: [],
    current_page: 1,
    from: 0,
    last_page: 1,
    links: [],
    path: "",
    per_page: 12,
    to: 0,
    total: 0,
  }

  return (
    <AppLayout>
      <Head title="Content Library" />

      <div className="py-6">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          {flash?.success && (
            <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
              {flash.success}
            </div>
          )}

          {/* Professional Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="p-2 sm:p-3 rounded-xl bg-primary/10 flex-shrink-0">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-2">Content Library</h1>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Manage your prayers and devotional content
                  </p>
                  {/* Active Filters Summary */}
                  {hasActiveFilters && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {search && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                          <Search className="h-3 w-3" />
                          "{search}"
                          <button
                            onClick={() => setSearch("")}
                            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      )}
                      {typeFilter !== "all" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                          <Filter className="h-3 w-3" />
                          {typeFilter}
                          <button
                            onClick={() => setTypeFilter("all")}
                            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <Link
                href={route("content.items.create")}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 px-4 rounded-lg transition-colors shadow-sm hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                Create Content
              </Link>
            </div>
          </div>

          {/* Filters Section */}
          <div className="bg-card border border-border rounded-xl shadow-sm p-6 mb-8">
            <div className="flex items-center gap-2 mb-6">
              <Filter className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Filters</h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium mb-2">Search Content</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by title, content, scripture, or tags..."
                    className="w-full pl-10 pr-10 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="sm:w-48">
                <label className="block text-sm font-medium mb-2">Content Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                >
                  <option value="all">All Types</option>
                  <option value="prayer">Prayers</option>
                  <option value="devotional">Devotionals</option>
                  <option value="scripture">Scriptures</option>
                </select>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2.5 text-sm border border-border rounded-lg hover:bg-accent transition-colors font-medium whitespace-nowrap"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Results Summary */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {safeContentItems.total === 0
                  ? "No content found"
                  : `Showing ${safeContentItems.from}-${safeContentItems.to} of ${safeContentItems.total} content items`}
              </p>
            </div>
            {hasActiveFilters && safeContentItems.data.length > 0 && (
              <div className="text-sm text-muted-foreground">Filtered results</div>
            )}
          </div>

          {/* Stats Cards */}
          {safeContentItems.data.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 shadow-sm">
                <div className="flex items-center">
                  <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-lg mr-3">
                    <Heart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Prayers</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                      {safeContentItems.data.filter((item) => item.type === "prayer").length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 shadow-sm">
                <div className="flex items-center">
                  <div className="bg-green-100 dark:bg-green-800 p-2 rounded-lg mr-3">
                    <BookOpen className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Devotionals</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                      {safeContentItems.data.filter((item) => item.type === "devotional").length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 shadow-sm">
                <div className="flex items-center">
                  <div className="bg-purple-100 dark:bg-purple-800 p-2 rounded-lg mr-3">
                    <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Scriptures</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                      {safeContentItems.data.filter((item) => item.type === "scripture").length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 shadow-sm">
                <div className="flex items-center">
                  <div className="bg-primary/20 p-2 rounded-lg mr-3">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">Total</p>
                    <p className="text-2xl font-bold text-primary">{safeContentItems.total}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Content Grid */}
          {safeContentItems.data.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <FileText className="h-12 w-12 text-muted-foreground opacity-50" />
              </div>
              <h3 className="text-lg font-medium mb-2">
                {hasActiveFilters ? "No content found" : "No content yet"}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {hasActiveFilters
                  ? "Try adjusting your search or filters to find what you're looking for."
                  : "Get started by creating your first prayer, devotional, or scripture content."}
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                  Clear Filters
                </button>
              ) : (
                <Link
                  href={route("content.items.create")}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create Your First Content
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Content Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8">
                {safeContentItems.data.map((item: ContentItem) => (
                  <div
                    key={item.id}
                    className="group bg-card border border-border rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                  >
      {/* Image with Gradient Overlay */}
      {item.meta?.image_url && (
        <div className="relative overflow-hidden">
          <img
            src={item.meta.image_url || "/placeholder.svg"}
            alt={item.title}
            className="w-full h-48 sm:h-56 lg:h-52 xl:h-48 2xl:h-56 object-cover transform group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Type Badge */}
                    <div className="absolute top-4 right-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-sm bg-card/90 border ${getTypeBadgeColor(item.type)} shadow-lg`}
                      >
                        {getTypeIcon(item.type)}
                        <span className="capitalize">{item.type}</span>
                      </span>
                    </div>

          {/* AI Generated Badge */}
          {item.meta?.ai_generated && (
            <div className="absolute top-4 left-4">
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg">
                <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 5.5V7H9V5.5L3 7V9L9 10.5V12L3 13.5V15.5L9 14V16L3 17.5V19.5L9 18V22H15V18L21 19.5V17.5L15 16V14L21 15.5V13.5L15 12V10.5L21 9Z"/>
                </svg>
                AI Generated
              </span>
            </div>
          )}
        </div>
      )}

                    {/* Content */}
                    <div className="p-4 sm:p-6">
                      {/* Type Badge for non-image items */}
                      {!item.meta?.image_url && (
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${getTypeBadgeColor(item.type)}`}
                          >
                            {getTypeIcon(item.type)}
                            <span className="capitalize">{item.type}</span>
                          </span>
                          {item.meta?.ai_generated && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                              <Sparkles className="w-3 h-3" />
                              AI
                            </span>
                          )}
                        </div>
                      )}

                      {/* Title */}
                      <h3 className="font-bold text-lg sm:text-xl line-clamp-2 mb-3 leading-tight group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>

                      {/* Body Text */}
                      <p className="text-muted-foreground text-sm sm:text-base mb-4 line-clamp-3 leading-relaxed">
                        {item.body.replace(/<[^>]*>/g, "")}
                      </p>

                      {/* Scripture Reference */}
                      {item.meta?.scripture_ref && (
                        <div className="flex items-center gap-2 text-sm text-primary mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                          <BookOpen className="w-4 h-4 flex-shrink-0" />
                          <span className="font-semibold truncate">{item.meta.scripture_ref}</span>
                        </div>
                      )}

                      {/* Tags */}
                      {item.meta?.tags && item.meta.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {item.meta.tags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-muted border border-border"
                            >
                              <TagIcon className="w-3 h-3" />
                              {tag}
                            </span>
                          ))}
                          {item.meta.tags.length > 3 && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-muted text-muted-foreground border border-border">
                              +{item.meta.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex flex-col items-start pt-4 border-t border-border gap-3">
                        {/* Author and Date */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">
                              {item.user?.name?.charAt(0) || "U"}
                            </div>
                            <span className="font-medium truncate max-w-[80px] sm:max-w-[100px]">
                              {item.user?.name || "Unknown"}
                            </span>
                          </div>
                          <span className="hidden sm:inline">•</span>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(item.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Link
                            href={route("content.items.edit", item.id)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-all font-medium text-sm flex-1 sm:flex-none"
                          >
                            <Edit className="w-4 h-4" />
                            <span className="hidden sm:inline">Edit</span>
                            <span className="sm:hidden">Edit</span>
                          </Link>
                          <Link
                            href={route("content.items.destroy", item.id)}
                            method="delete"
                            as="button"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 rounded-lg transition-all font-medium text-sm flex-1 sm:flex-none"
                            onClick={(e: React.MouseEvent) => {
                              if (!confirm("Are you sure you want to delete this content?")) {
                                e.preventDefault()
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Delete</span>
                            <span className="sm:hidden">Delete</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {safeContentItems.last_page > 1 && (
                <div className="mt-8 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 border-t border-border pt-6">
                  <div className="text-sm text-muted-foreground">
                    Showing {safeContentItems.from} to {safeContentItems.to} of {safeContentItems.total} results
                  </div>
                  <nav className="flex space-x-1 flex-wrap justify-center sm:justify-end">
                    {safeContentItems.links.map((link: any, index: number) => (
                      <Link
                        key={index}
                        href={link.url || "#"}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          link.active
                            ? "bg-primary text-primary-foreground"
                            : "bg-card text-muted-foreground hover:bg-accent border border-border"
                        } ${!link.url && "opacity-50 cursor-not-allowed pointer-events-none"}`}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                      />
                    ))}
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

export default ContentIndex
