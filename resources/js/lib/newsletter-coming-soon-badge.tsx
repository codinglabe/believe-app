import { cn } from "@/lib/utils"

export function NewsletterComingSoonBadge({ className }: { className?: string }) {
    return (
        <span
            className={cn(
                "shrink-0 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white",
                className
            )}
        >
            Coming Soon
        </span>
    )
}
