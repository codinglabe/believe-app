"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Head, Link, router, usePage } from "@inertiajs/react"
import type { PageProps, ContentItem } from "@/types"
import AppLayout from "@/layouts/app-layout"

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
        return (
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        )
      case "devotional":
        return (
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        )
      case "scripture":
        return (
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        )
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
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          {flash?.success && (
            <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
              {flash.success}
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div className="p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              {/* Header Section */}
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-6 space-y-4 lg:space-y-0">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Content Library</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your prayers and devotional content</p>

                  {/* Active Filters Summary */}
                  {hasActiveFilters && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {search && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          Search: "{search}"
                          <button
                            onClick={() => setSearch("")}
                            className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      )}
                      {typeFilter !== "all" && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          Type: {typeFilter}
                          <button
                            onClick={() => setTypeFilter("all")}
                            className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-green-200 dark:hover:bg-green-800"
                          >
                            ×
                          </button>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Create Content Button */}
                <Link
                  href={route("content.items.create")}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg flex items-center transition-colors whitespace-nowrap self-start"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Content
                </Link>
              </div>

              {/* Filters Section */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
                    {/* Search Input */}
                    <div className="flex-1 min-w-0">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Search Content
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                        </div>
                        <input
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search by title, content, scripture, or tags..."
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors"
                        />
                        {search && (
                          <button
                            onClick={() => setSearch("")}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            <svg
                              className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Type Filter */}
                    <div className="sm:w-48">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Content Type
                      </label>
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                      >
                        <option value="all">All Types</option>
                        <option value="prayer">Prayers</option>
                        <option value="devotional">Devotionals</option>
                        <option value="scripture">Scriptures</option>
                      </select>
                    </div>
                  </div>

                  {/* Clear Filters Button */}
                  {hasActiveFilters && (
                    <div className="sm:self-end">
                      <button
                        onClick={clearFilters}
                        className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Results Summary */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {safeContentItems.total === 0
                      ? "No content found"
                      : `Showing ${safeContentItems.from}-${safeContentItems.to} of ${safeContentItems.total} content items`}
                  </p>
                </div>
                {hasActiveFilters && safeContentItems.data.length > 0 && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">Filtered results</div>
                )}
              </div>

              {/* Content Grid */}
              {safeContentItems.data.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {hasActiveFilters ? "No content found" : "No content yet"}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    {hasActiveFilters
                      ? "Try adjusting your search or filters to find what you're looking for."
                      : "Get started by creating your first prayer, devotional, or scripture content."}
                  </p>
                  {hasActiveFilters ? (
                    <button
                      onClick={clearFilters}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                    >
                      Clear Filters
                    </button>
                  ) : (
                    <Link
                      href={route("content.items.create")}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create Your First Content
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  {/* Stats Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-lg mr-3">
                          <svg
                            className="w-6 h-6 text-blue-600 dark:text-blue-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Prayers</p>
                          <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                            {safeContentItems.data.filter((item) => item.type === "prayer").length}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="bg-green-100 dark:bg-green-800 p-2 rounded-lg mr-3">
                          <svg
                            className="w-6 h-6 text-green-600 dark:text-green-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-600 dark:text-green-400">Devotionals</p>
                          <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                            {safeContentItems.data.filter((item) => item.type === "devotional").length}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="bg-purple-100 dark:bg-purple-800 p-2 rounded-lg mr-3">
                          <svg
                            className="w-6 h-6 text-purple-600 dark:text-purple-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Scriptures</p>
                          <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                            {safeContentItems.data.filter((item) => item.type === "scripture").length}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="bg-gray-100 dark:bg-gray-600 p-2 rounded-lg mr-3">
                          <svg
                            className="w-6 h-6 text-gray-600 dark:text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-gray-300">
                            {safeContentItems.total}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content Grid */}
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8">
  {safeContentItems.data.map((item: ContentItem) => (
    <div
      key={item.id}
      className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-2xl dark:shadow-gray-900/30 transition-all duration-300 hover:translate-y-[-4px] overflow-hidden"
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
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 ${getTypeBadgeColor(item.type)} shadow-lg`}
            >
              {getTypeIcon(item.type)}
              <span className="ml-1.5 capitalize">{item.type}</span>
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
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${getTypeBadgeColor(item.type)}`}
            >
              {getTypeIcon(item.type)}
              <span className="ml-1.5 capitalize">{item.type}</span>
            </span>
            {item.meta?.ai_generated && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 5.5V7H9V5.5L3 7V9L9 10.5V12L3 13.5V15.5L9 14V16L3 17.5V19.5L9 18V22H15V18L21 19.5V17.5L15 16V14L21 15.5V13.5L15 12V10.5L21 9Z"/>
                </svg>
                AI
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <h3 className="font-bold text-lg sm:text-xl text-gray-900 dark:text-white line-clamp-2 mb-3 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {item.title}
        </h3>

        {/* Body Text */}
        <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base mb-4 line-clamp-3 leading-relaxed">
          {item.body.replace(/<[^>]*>/g, "")}
        </p>

        {/* Scripture Reference */}
        {item.meta?.scripture_ref && (
          <div className="flex items-center text-sm text-blue-600 dark:text-blue-400 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
            <svg
              className="w-4 h-4 mr-2 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <span className="font-semibold truncate">{item.meta.scripture_ref}</span>
          </div>
        )}

        {/* Tags */}
        {item.meta?.tags && item.meta.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {item.meta.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
              >
                #{tag}
              </span>
            ))}
            {item.meta.tags.length > 3 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                +{item.meta.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col items-start pt-4 border-t border-gray-200 dark:border-gray-700 gap-3">
          {/* Author and Date */}
          <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {item.user?.name?.charAt(0) || "U"}
              </div>
              <span className="font-medium truncate max-w-[80px] sm:max-w-[100px]">
                {item.user?.name || "Unknown"}
              </span>
            </div>
            <span className="hidden sm:inline">•</span>
            <span className="text-xs">{new Date(item.created_at).toLocaleDateString()}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Link
              href={route("content.items.edit", item.id)}
              className="inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md flex-1 sm:flex-none"
            >
              <svg className="w-4 h-4 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <span className="hidden sm:inline">Edit</span>
              <span className="sm:hidden">Edit</span>
            </Link>
            <Link
              href={route("content.items.destroy", item.id)}
              method="delete"
              as="button"
              className="inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-600 text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md flex-1 sm:flex-none"
              onClick={(e: React.MouseEvent) => {
                if (!confirm("Are you sure you want to delete this content?")) {
                  e.preventDefault()
                }
              }}
            >
              <svg className="w-4 h-4 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
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
                    <div className="mt-8 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 border-t border-gray-200 dark:border-gray-700 pt-6">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        Showing {safeContentItems.from} to {safeContentItems.to} of {safeContentItems.total} results
                      </div>
                      <nav className="flex space-x-1 flex-wrap justify-center sm:justify-end">
                        {safeContentItems.links.map((link: any, index: number) => (
                          <Link
                            key={index}
                            href={link.url || "#"}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                              link.active
                                ? "bg-blue-600 text-white"
                                : "bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"
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
        </div>
      </div>
    </AppLayout>
  )
}

export default ContentIndex
