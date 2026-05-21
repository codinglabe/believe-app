import { Link } from "@inertiajs/react"
import { Button } from "@/components/frontend/ui/button"
import { ArrowLeft, Video } from "lucide-react"

interface Props {
  title: string
  hostName: string
  message: string
}

export default function StreamEndedOverlay({ title, hostName, message }: Props) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 px-6 py-12 bg-gradient-to-br from-neutral-900/95 via-purple-950/90 to-neutral-900/95 text-white">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
        <Video className="h-8 w-8 text-purple-300" />
      </div>
      <div className="text-center max-w-md space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-purple-300">
          Stream ended
        </p>
        <h2 className="text-xl sm:text-2xl font-semibold">{message}</h2>
        <p className="text-sm text-neutral-300">
          {title} · {hostName}
        </p>
      </div>
      <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/10">
        <Link href="/unity-live">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Browse Unity Live
        </Link>
      </Button>
    </div>
  )
}
