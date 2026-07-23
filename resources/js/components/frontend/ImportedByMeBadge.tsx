import { cn } from "@/lib/utils"

/** Small badge for URL-imported Unity Videos — only render when `is_my_import` is true for the viewer. */
export function ImportedByMeBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute left-1.5 top-1.5 z-10 inline-flex items-center rounded-md bg-gradient-to-r from-purple-600 to-blue-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm",
        className
      )}
    >
      Imported
    </span>
  )
}
