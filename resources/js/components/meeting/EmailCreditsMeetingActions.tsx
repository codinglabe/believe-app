import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import EmailCreditsBadge from "@/components/meeting/EmailCreditsBadge"
import { cn } from "@/lib/utils"

type EmailCreditsMeetingActionsProps = {
  emailsLeft: number
  onBuy: () => void
  className?: string
}

/** Credits + buy control sized for narrow Unity Meet sidebars. */
export default function EmailCreditsMeetingActions({
  emailsLeft,
  onBuy,
  className,
}: EmailCreditsMeetingActionsProps) {
  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-2", className)}>
      <EmailCreditsBadge emailsLeft={emailsLeft} size="sm" compact className="min-w-0 max-w-full" />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 shrink-0 rounded-full border-purple-300/60 bg-background px-2.5 text-xs font-medium text-purple-700 hover:bg-purple-500/10 hover:text-purple-800 dark:border-purple-500/40 dark:text-purple-300"
        onClick={onBuy}
      >
        <Plus className="mr-1 h-3 w-3" />
        Buy
      </Button>
    </div>
  )
}
