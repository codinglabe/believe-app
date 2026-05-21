import { Loader2, Radio } from "lucide-react"

interface Props {
  message?: string
}

export default function GoingLiveOverlay({ message = "Going live — starting the player…" }: Props) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 px-6 py-12 bg-gradient-to-br from-purple-600/20 via-blue-600/15 to-purple-600/10 dark:from-purple-950/80 dark:via-blue-950/70 dark:to-neutral-950/90">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg">
        <Radio className="h-7 w-7 text-white animate-pulse" />
      </div>
      <div className="text-center max-w-sm space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300">
          Going live
        </p>
        <p className="text-sm font-medium text-neutral-900 dark:text-white">{message}</p>
      </div>
      <Loader2 className="h-8 w-8 text-purple-600 dark:text-purple-400 animate-spin" aria-hidden />
    </div>
  )
}
