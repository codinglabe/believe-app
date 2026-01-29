"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { router, useForm } from "@inertiajs/react"
import type { PageProps } from "@/types"
import { useState, useEffect } from "react"

interface NewsItem {
  source: string
  title: string
  link: string
  summary?: string
  published_at?: string
}

interface Props extends PageProps {
  items?: NewsItem[]
  allSources: string[]
  sources: string[]
  query: string
  updated_at: string
  current_page: number
  last_page: number
  from: number
  to: number
  total: number
}

export default function NonprofitNews({
  items = [],
  allSources = [],
  sources = [],
  query = "",
  updated_at,
  current_page = 1,
  last_page = 1,
  from = 0,
  to = 0,
  total = 0,
}: Props) {
  const { data, setData, processing } = useForm({
    q: query || "",
    sources: sources || [],
    page: current_page,
  })

  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    // Check if dark mode is preferred
    const isDark = localStorage.getItem('darkMode') === 'true' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDark);

    // Update document class for Tailwind dark mode
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());

    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleSource = (src: string) => {
    const updatedSources = data.sources.includes(src)
      ? data.sources.filter((s) => s !== src)
      : [...data.sources, src];

    setData("sources", updatedSources);
  }

  const SelectAllSources = () => {
      setData("sources", [...allSources]);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    router.get(route("nonprofit.news"), { ...data, page: 1 }, {
      preserveScroll: true,
      preserveState: true,
      onFinish: () => setIsLoading(false),
    })
  }

  const clearFilters = () => {
    const resetData = { q: "", sources: [], page: 1 }
    setData(resetData)
    setIsLoading(true)

    router.get(route("nonprofit.news"), resetData, {
      preserveScroll: true,
      preserveState: true,
      onFinish: () => setIsLoading(false),
    })
  }

  const handlePageChange = (page: number) => {
    setIsLoading(true)

    router.get(route("nonprofit.news"), { ...data, page }, {
      preserveScroll: true,
      preserveState: true,
      onFinish: () => setIsLoading(false),
    })
  }

//   // Check if all sources are selected
//   const allSourcesSelected = data.sources.length === allSources.length;
//   // Check if some (but not all) sources are selected
//   const someSourcesSelected = data.sources.length > 0 && data.sources.length < allSources.length;

  // Show loading state
  if (isLoading || processing) {
    return (
      <FrontendLayout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-8">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center">
              <div className="animate-pulse bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 max-w-2xl mx-auto">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto mb-8"></div>
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </FrontendLayout>
    )
  }

  return (
    <FrontendLayout>
      <PageHead title="Nonprofit News" description="Stay updated with the latest news and stories from the nonprofit sector. Curated articles from trusted sources." />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8 relative">
            {/* <button
              onClick={toggleDarkMode}
              className="absolute right-0 top-0 p-2 rounded-full bg-white dark:bg-gray-800 shadow-md"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 01-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button> */}

            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">Nonprofit News Aggregator</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Stay updated with the latest news and insights from leading nonprofit organizations
            </p>
          </div>

          {/* Stats Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-6 flex flex-wrap justify-between items-center">
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <span className="block text-2xl font-bold text-blue-600 dark:text-blue-400">{total}</span>
                <span className="block text-sm text-gray-500 dark:text-gray-400">Total Articles</span>
              </div>
              <div className="text-center">
                <span className="block text-2xl font-bold text-blue-600 dark:text-blue-400">{sources.length === 0 ? allSources.length : sources.length}</span>
                <span className="block text-sm text-gray-500 dark:text-gray-400">Sources</span>
              </div>
              <div className="text-center">
                <span className="block text-2xl font-bold text-blue-600 dark:text-blue-400">{from}-{to}</span>
                <span className="block text-sm text-gray-500 dark:text-gray-400">Showing</span>
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Last updated: {updated_at ? new Date(updated_at).toLocaleString() : 'Loading...'}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Filters Sidebar */}
            <div className="lg:w-1/4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 sticky top-6">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Filters</h2>
                  <button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="lg:hidden text-blue-600 dark:text-blue-400"
                  >
                    {isFilterOpen ? 'Hide' : 'Show'}
                  </button>
                </div>

                <div className={`${isFilterOpen ? 'block' : 'hidden'} lg:block`}>
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
                    <input
                      type="text"
                      name="q"
                      value={data.q}
                      onChange={(e) => setData("q", e.target.value)}
                      placeholder="Search articles..."
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sources</label>
                      <button
                        type="button"
                        onClick={SelectAllSources}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {'Select All'}
                      </button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {allSources.length > 0 ? allSources.map((src) => {
                        // When no sources are selected, consider all as selected (for display purposes only)
                        const isEffectivelyChecked = data.sources.length === 0 || data.sources.includes(src);

                        return (
                          <label
                            key={src}
                            className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isEffectivelyChecked}
                              onChange={() => toggleSource(src)}
                              className="rounded text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
                            />
                            <span className={data.sources.length === 0 ? "text-gray-400" : ""}>
                              {src}
                            </span>
                          </label>
                        )
                      }) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No sources available</p>
                      )}
                    </div>
                    {data.sources.length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Showing all sources by default
                      </p>
                    )}
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleSubmit}
                      disabled={processing}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                    >
                      Apply Filters
                    </button>
                    <button
                      onClick={clearFilters}
                      disabled={processing}
                      className="px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Articles List */}
            <div className="lg:w-3/4">
              {items.length > 0 ? (
                <>
                  <div className="grid gap-5 mb-6">
                    {items.map((item, i) => (
                      <article
                        key={i}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 border-l-4 border-blue-500"
                      >
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-3">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                {item.source}
                            </span>
                            {item.published_at && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(item.published_at).toLocaleDateString()}
                                </span>
                            )}
                            </div>

                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {item.title}
                            </a>
                          </h2>

                          {item.summary && (
                            <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
                              {item.summary.length > 220
                                ? item.summary.slice(0, 220) + "..."
                                : item.summary}
                            </p>
                          )}

                          <div className="flex justify-between items-center">
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-sm"
                            >
                              Read full article
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>

                  {/* Pagination */}
                  {last_page > 1 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 flex justify-between items-center">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        Showing <span className="font-medium">{from}</span> to <span className="font-medium">{to}</span> of{' '}
                        <span className="font-medium">{total}</span> results
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handlePageChange(current_page - 1)}
                          disabled={current_page === 1}
                          className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                        >
                          Previous
                        </button>

                        {Array.from({ length: Math.min(5, last_page) }, (_, i) => {
                          // Show pages around current page
                          let pageNum;
                          if (last_page <= 5) {
                            pageNum = i + 1;
                          } else if (current_page <= 3) {
                            pageNum = i + 1;
                          } else if (current_page >= last_page - 2) {
                            pageNum = last_page - 4 + i;
                          } else {
                            pageNum = current_page - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-1 rounded-md ${
                                current_page === pageNum
                                  ? 'bg-blue-600 text-white'
                                  : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        <button
                          onClick={() => handlePageChange(current_page + 1)}
                          disabled={current_page === last_page}
                          className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">No articles found</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {total > 0
                      ? "Try adjusting your filters or search terms."
                      : "No news articles available at the moment. Please check back later."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Attribution */}
          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>Data courtesy of each publisher via RSS. Headlines link to the original source.</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </FrontendLayout>
  )
}
