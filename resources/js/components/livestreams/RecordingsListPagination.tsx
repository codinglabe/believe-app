"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

function visiblePages(current: number, last: number): (number | "ellipsis")[] {
  if (last <= 1) return [1]
  if (last <= 7) {
    return Array.from({ length: last }, (_, i) => i + 1)
  }

  const pages: (number | "ellipsis")[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(last - 1, current + 1)

  if (start > 2) pages.push("ellipsis")
  for (let p = start; p <= end; p++) pages.push(p)
  if (end < last - 1) pages.push("ellipsis")
  if (last > 1) pages.push(last)

  return pages
}

export interface RecordingsListPaginationProps {
  page: number
  lastPage: number
  total: number
  from: number
  to: number
  perPage: number
  loading?: boolean
  onPageChange: (page: number) => void
}

export default function RecordingsListPagination({
  page,
  lastPage,
  total,
  from,
  to,
  perPage,
  loading = false,
  onPageChange,
}: RecordingsListPaginationProps) {
  if (total === 0) return null

  const safeLast = Math.max(1, lastPage)
  const pages = visiblePages(page, safeLast)
  const showSteps = safeLast > 1

  return (
    <div className="flex flex-col gap-4 border-t border-border bg-muted/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{from}</span>
        {" – "}
        <span className="font-medium text-foreground">{to}</span>
        {" of "}
        <span className="font-medium text-foreground">{total}</span>
        {" recording"}
        {total === 1 ? "" : "s"}
        <span className="hidden sm:inline text-muted-foreground">
          {" "}
          · {perPage} per page
          {showSteps ? ` · Page ${page} of ${safeLast}` : ""}
        </span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-purple-600 dark:text-purple-400" aria-hidden />
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        <div className="flex items-center gap-1" role="navigation" aria-label="Pagination">
          {pages.map((p, index) =>
            p === "ellipsis" ? (
              <span key={`ellipsis-${index}`} className="px-2 text-sm text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={p}
                type="button"
                variant={page === p ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-9 min-w-9 px-2",
                  page === p &&
                    "border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm hover:from-purple-700 hover:to-blue-700",
                )}
                disabled={loading}
                onClick={() => onPageChange(p)}
                aria-current={page === p ? "page" : undefined}
              >
                {p}
              </Button>
            ),
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1"
          disabled={page >= safeLast || loading}
          onClick={() => onPageChange(page + 1)}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
