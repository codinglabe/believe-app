"use client"

import * as React from "react"
import { useMemo, useCallback } from "react"
import { X, AlertCircle } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

export type PrimaryActionCategoryOption = { id: number; name: string }

type Props = {
  categories: PrimaryActionCategoryOption[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  disabled?: boolean
  error?: string
  /** Defaults to "Causes". Use "Cause" when only one may be selected. */
  label?: string
  /** Set to 1 for single-select (e.g. events). */
  maxSelections?: number
  /**
   * Where options are sourced from: org Category Grid vs profile Supporters Interest.
   * Defaults to organization (non–Connection Hub flows).
   */
  causesCatalogSource?: "organization" | "supporter"
}

/**
 * Causes — same chip + dropdown UX as Supporters Interest on profile edit and Causes & Interest on settings/profile.
 */
export function OrganizationPrimaryActionCategoriesField({
  categories,
  selectedIds,
  onSelectionChange,
  disabled = false,
  error,
  label = "Causes",
  maxSelections,
  causesCatalogSource = "organization",
}: Props) {
  const single = maxSelections === 1
  const addControlId = React.useId()

  const selectedCategories = useMemo(
    () => categories.filter((c) => selectedIds.includes(String(c.id))),
    [categories, selectedIds],
  )

  const remainingCategories = useMemo(
    () => categories.filter((c) => !selectedIds.includes(String(c.id))),
    [categories, selectedIds],
  )

  /** Multi-select: respect cap. Single-select: always allow swap via dropdown when other categories exist. */
  const underSelectionCap =
    maxSelections == null || selectedIds.length < maxSelections

  const showAddDropdown =
    !disabled &&
    remainingCategories.length > 0 &&
    (single || underSelectionCap)

  const addTag = useCallback(
    (id: number) => {
      if (disabled) return
      const sid = String(id)
      if (selectedIds.includes(sid)) return
      if (single) {
        onSelectionChange([sid])
        return
      }
      if (maxSelections != null && selectedIds.length >= maxSelections) {
        return
      }
      onSelectionChange([...selectedIds, sid])
    },
    [disabled, single, maxSelections, selectedIds, onSelectionChange],
  )

  const removeTag = useCallback(
    (id: number) => {
      if (disabled) return
      onSelectionChange(selectedIds.filter((x) => x !== String(id)))
    },
    [disabled, selectedIds, onSelectionChange],
  )

  const helper =
    causesCatalogSource === "supporter" ? (
      <>
        Same catalog as your profile{" "}
        <span className="font-medium">Supporters Interest</span> (e.g. Housing, Food). Update your selections in profile
        settings if you need more options here.
      </>
    ) : (
      <>
        Same as your organization&apos;s <span className="font-medium">Category Grid (Primary Action)</span> — e.g.
        Housing, Food. Update your selections in profile settings if you need more options here.
      </>
    )

  const emptyMessage =
    causesCatalogSource === "supporter" ? (
      <>
        You have no Supporters Interest categories selected yet. Add them under Settings → Profile (Supporters
        Interest).
      </>
    ) : (
      <>
        Your organization has no primary action categories selected yet. Add them under Settings → Profile (Category
        Grid).
      </>
    )

  return (
    <div className="space-y-2 md:col-span-2">
      <label className="text-sm font-medium">{label}</label>
      <p className="text-xs text-muted-foreground">{helper}</p>
      {categories.length === 0 ? (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">{emptyMessage}</AlertDescription>
        </Alert>
      ) : (
        <div
          role="group"
          aria-label={label}
          className={cn(
            "flex min-h-10 w-full flex-wrap items-center gap-1 rounded-md border bg-background px-2 py-1 text-sm text-foreground ring-offset-background transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            "border-input dark:border-gray-600",
            error && "border-destructive focus-within:ring-destructive",
            disabled && "pointer-events-none opacity-60",
          )}
        >
          {selectedCategories.map((c) => (
            <span
              key={c.id}
              className="tagify-tag inline-flex max-w-full items-center gap-0.5 rounded-md border border-white/25 bg-gradient-to-r from-purple-600 to-blue-600 px-1.5 py-0.5 text-[13px] leading-tight text-white shadow-sm"
            >
              <span className="truncate">{c.name}</span>
              <button
                type="button"
                onClick={() => removeTag(c.id)}
                className="tagify-tag__removeBtn ml-0.5 inline-flex size-[14px] shrink-0 cursor-pointer items-center justify-center rounded-sm text-white/85 transition-colors hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label={`Remove ${c.name}`}
              >
                <X className="h-2.5 w-2.5" strokeWidth={2.5} />
              </button>
            </span>
          ))}
          {showAddDropdown ? (
            <>
              <label className="sr-only" htmlFor={addControlId}>
                {single ? "Select a cause" : "Add cause or category"}
              </label>
              <Select
                key={selectedIds.join(",")}
                onValueChange={(v) => {
                  if (v) addTag(Number(v))
                }}
              >
                <SelectTrigger
                  id={addControlId}
                  className="tagify__input h-7 min-w-[7rem] flex-1 justify-start border-0 bg-transparent px-1 py-0.5 text-sm text-muted-foreground shadow-none ring-0 ring-offset-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 data-[placeholder]:text-muted-foreground [&_svg]:hidden"
                >
                  <SelectValue placeholder={single ? "Select a cause…" : "Add category…"} />
                </SelectTrigger>
                <SelectContent className="max-h-60 border border-border bg-popover text-popover-foreground shadow-md">
                  {remainingCategories.map((c) => (
                    <SelectItem
                      key={c.id}
                      value={String(c.id)}
                      className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                    >
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : selectedCategories.length > 0 &&
            maxSelections != null &&
            !single &&
            selectedIds.length >= maxSelections &&
            remainingCategories.length > 0 ? (
            <span className="px-1 text-xs text-muted-foreground">Maximum selected</span>
          ) : selectedCategories.length > 0 && remainingCategories.length === 0 ? (
            <span className="px-1 text-xs text-muted-foreground">All categories selected</span>
          ) : null}
        </div>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
