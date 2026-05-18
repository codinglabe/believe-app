"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { router } from "@inertiajs/react"
import { Check, ChevronsUpDown, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface LedgerOrgPickerPayload {
  items: Array<{ value: string; label: string }>
  has_more: boolean
  page: number
  search: string
}

interface LedgerOrganizationComboboxProps {
  value: string
  onValueChange: (value: string) => void
  /** Ledger filters as query params (search, type, status, …). Do not include org_picker_* keys. */
  ledgerQueryParams: Record<string, string>
  /** For showing the selected org label before the list loads (from server). */
  initialOptions: Array<{ value: string; label: string }>
  className?: string
}

/**
 * Organization filter: search + scroll pagination via Inertia partial reloads only (no fetch/axios).
 */
export function LedgerOrganizationCombobox({
  value,
  onValueChange,
  ledgerQueryParams,
  initialOptions,
  className,
}: LedgerOrganizationComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [items, setItems] = useState<Array<{ value: string; label: string }>>([])
  const [hasMore, setHasMore] = useState(false)
  const [loadedPage, setLoadedPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const lastRequestedSearch = useRef("")
  const firstOpenLoadRef = useRef(true)

  const mergedOptions = (() => {
    const map = new Map<string, string>()
    for (const o of initialOptions) {
      map.set(o.value, o.label)
    }
    for (const o of items) {
      map.set(o.value, o.label)
    }
    return Array.from(map.entries()).map(([v, l]) => ({ value: v, label: l }))
  })()

  const selectedOption =
    value === "all" || value === ""
      ? { value: "all", label: "All organizations" }
      : mergedOptions.find((o) => o.value === value)

  const visitOrgPicker = useCallback(
    (page: number, q: string, mode: "reset" | "append") => {
      const params: Record<string, string> = {
        ...ledgerQueryParams,
        org_picker_page: String(page),
        org_picker_q: q,
      }
      router.get(route("admin.transactions.ledger"), params, {
        only: ["ledgerOrgPicker"],
        preserveState: true,
        replace: true,
        onStart: () => {
          if (mode === "reset") setLoading(true)
          else setLoadingMore(true)
        },
        onFinish: () => {
          setLoading(false)
          setLoadingMore(false)
        },
        onSuccess: (pageProps) => {
          const raw = (pageProps.props as { ledgerOrgPicker?: LedgerOrgPickerPayload }).ledgerOrgPicker
          if (!raw?.items) return
          if (mode === "reset") {
            setItems(raw.items)
          } else {
            setItems((prev) => {
              const seen = new Set(prev.map((x) => x.value))
              const next = [...prev]
              for (const row of raw.items) {
                if (!seen.has(row.value)) {
                  seen.add(row.value)
                  next.push(row)
                }
              }
              return next
            })
          }
          setHasMore(raw.has_more)
          setLoadedPage(raw.page)
          lastRequestedSearch.current = q
        },
      })
    },
    [ledgerQueryParams],
  )

  useEffect(() => {
    if (!open) {
      firstOpenLoadRef.current = true
      setItems([])
      setLoadedPage(0)
      setHasMore(false)
      setSearchQuery("")
      return
    }

    const q = searchQuery.trim()
    const immediate = firstOpenLoadRef.current && q === ""
    if (immediate) {
      firstOpenLoadRef.current = false
    }
    const delay = immediate ? 0 : 320

    const id = window.setTimeout(() => {
      visitOrgPicker(1, q, "reset")
    }, delay)

    return () => window.clearTimeout(id)
  }, [open, searchQuery, visitOrgPicker])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  const displayRows = items.length > 0 ? items : mergedOptions

  const handleScroll = () => {
    const el = listRef.current
    if (!el || !hasMore || loadingMore || loading) return
    if (loadedPage < 1) return
    const { scrollTop, scrollHeight, clientHeight } = el
    if (scrollHeight - (scrollTop + clientHeight) < 48) {
      visitOrgPicker(loadedPage + 1, lastRequestedSearch.current, "append")
    }
  }

  const handleSelect = (optionValue: string) => {
    const next = optionValue === value ? "all" : optionValue
    onValueChange(next === "" ? "all" : next)
    setOpen(false)
    setSearchQuery("")
  }

  const isAll = value === "all" || value === ""

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        onClick={() => !loading && setOpen(!open)}
        className={cn(
          "w-full justify-between h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isAll && "text-muted-foreground",
          className,
        )}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : "All organizations"}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false)
            }
          }}
        >
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search organizations…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              onKeyDown={(e) => {
                if (e.key === "Enter" && displayRows.length === 1) {
                  handleSelect(displayRows[0].value)
                }
              }}
            />
            {searchQuery ? (
              <button
                type="button"
                title="Clear search"
                aria-label="Clear search"
                className="ml-2 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation()
                  setSearchQuery("")
                }}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div
            ref={listRef}
            className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1"
            onScroll={handleScroll}
          >
            {loading && displayRows.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>
            ) : displayRows.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No organization matches.</div>
            ) : (
              <div className="space-y-1">
                {displayRows.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                      value === option.value && "bg-accent text-accent-foreground",
                    )}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                    <span className="flex-1 truncate text-left">{option.label}</span>
                  </button>
                ))}
                {loadingMore ? (
                  <div className="py-2 text-center text-xs text-muted-foreground">Loading more…</div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
