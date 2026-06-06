"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Home } from "lucide-react"
import { Link, router, usePage } from "@inertiajs/react"
import { cn } from "@/lib/utils"

type ChatNavActionsProps = {
  className?: string
  iconClassName?: string
  showLabels?: boolean
}

export function ChatNavActions({ className, iconClassName = "h-5 w-5", showLabels = false }: ChatNavActionsProps) {
  const { auth } = usePage().props as { auth?: { user?: { role?: string } } }

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back()
      return
    }

    const fallback =
      auth?.user?.role !== "user" ? route("dashboard") : route("user.profile.index")
    router.visit(fallback)
  }

  return (
    <div className={cn("flex shrink-0 items-center gap-0.5", className)}>
      <Link href="/">
        <Button
          variant="ghost"
          size={showLabels ? "sm" : "icon"}
          title="Go home"
          className={cn(
            "hover:bg-muted",
            showLabels && "gap-1.5 px-2.5",
          )}
        >
          <Home className={iconClassName} />
          {showLabels && <span className="text-sm">Home</span>}
        </Button>
      </Link>
      <Button
        variant="ghost"
        size={showLabels ? "sm" : "icon"}
        title="Go back"
        className={cn(
          "hover:bg-muted",
          showLabels && "gap-1.5 px-2.5",
        )}
        onClick={handleGoBack}
      >
        <ArrowLeft className={iconClassName} />
        {showLabels && <span className="text-sm">Back</span>}
      </Button>
    </div>
  )
}
