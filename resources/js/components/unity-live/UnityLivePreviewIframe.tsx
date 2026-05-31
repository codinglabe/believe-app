import { cn } from "@/lib/utils"
import type { UnityLiveStreamItem } from "@/lib/unity-live-display"

/** Muted room-view URL for autoplaying live previews on listing cards. */
export function unityLivePreviewSrc(stream: Pick<UnityLiveStreamItem, "viewUrl" | "viewUrlMuted">): string {
  const url = stream.viewUrlMuted ?? stream.viewUrl
  if (url.includes("noaudio") || url.includes("mute")) {
    return url
  }
  return `${url}${url.includes("?") ? "&" : "?"}noaudio`
}

type UnityLivePreviewIframeProps = {
  stream: Pick<UnityLiveStreamItem, "viewUrl" | "viewUrlMuted">
  title: string
  className?: string
}

export function UnityLivePreviewIframe({ stream, title, className }: UnityLivePreviewIframeProps) {
  return (
    <iframe
      src={unityLivePreviewSrc(stream)}
      title={title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      className={cn(
        "pointer-events-none absolute inset-0 z-0 h-full w-full scale-[1.02] border-0",
        className,
      )}
    />
  )
}
