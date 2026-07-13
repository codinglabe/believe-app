"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle2, Cloud, ExternalLink, Loader2, Youtube } from "lucide-react"
export type YoutubeUploadProgressRow = {
  dropbox_path: string
  status: string
  progress_stage?: string | null
  progress_percent?: number
  error_message?: string | null
  youtube_watch_url?: string | null
}

function stageLabel(upload: YoutubeUploadProgressRow | undefined): string {
  if (!upload) return "Starting upload…"
  if (upload.status === "failed") return "Upload failed"
  if (upload.status === "published") return "Published on YouTube"

  const stage = upload.progress_stage ?? upload.status
  switch (stage) {
    case "queued":
    case "pending":
      return "Starting upload…"
    case "downloading":
      return "Downloading from Dropbox"
    case "uploading":
      return "Uploading to YouTube"
    case "processing":
      return "Finishing on YouTube"
    case "complete":
      return "Complete"
    default:
      return upload.status === "uploading" ? "Uploading to YouTube" : "Processing…"
  }
}

function progressValue(upload: YoutubeUploadProgressRow | undefined): number {
  if (!upload) return 3
  if (upload.status === "published") return 100
  if (upload.status === "failed") return upload.progress_percent ?? 0
  if (upload.progress_percent && upload.progress_percent > 0) return upload.progress_percent
  if (upload.status === "uploading") return 25
  if (upload.status === "pending") return 8
  return 5
}

export interface YoutubeUploadProgressDialogProps {
  open: boolean
  fileName: string
  title: string
  upload: YoutubeUploadProgressRow | undefined
  polling: boolean
  onClose: () => void
  onRetry?: () => void
  retrying?: boolean
}

export default function YoutubeUploadProgressDialog({
  open,
  fileName,
  title,
  upload,
  polling,
  onClose,
  onRetry,
  retrying = false,
}: YoutubeUploadProgressDialogProps) {
  const failed = upload?.status === "failed"
  const published = upload?.status === "published"
  const inProgress = !failed && !published
  const percent = progressValue(upload)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && (published || failed)) onClose()
        if (!next && inProgress) return
      }}
    >
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => inProgress && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-600" />
            {published ? "Uploaded to YouTube" : failed ? "YouTube upload failed" : "Uploading to YouTube"}
          </DialogTitle>
          <DialogDescription className="text-left">
            <span className="font-medium text-foreground">{title}</span>
            <span className="mt-1 block truncate text-xs text-muted-foreground">{fileName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {published ? (
            <div className="flex items-start gap-3 rounded-lg border border-green-500/25 bg-green-500/10 p-4">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
              <div className="min-w-0 space-y-2">
                <p className="text-sm font-medium text-foreground">Your video is on YouTube.</p>
                {upload?.youtube_watch_url ? (
                  <Button asChild size="sm" className="gap-2">
                    <a href={upload.youtube_watch_url} target="_blank" rel="noopener noreferrer">
                      Open on YouTube
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : failed ? (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-foreground">Something went wrong</p>
                <p className="text-sm text-muted-foreground">
                  {upload?.error_message ??
                    "The upload could not be completed. Reconnect YouTube under Integrations if needed, then try again."}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{stageLabel(upload)}</span>
                  <span className="font-medium tabular-nums text-foreground">{percent}%</span>
                </div>
                <Progress
                  value={percent}
                  className={cn("h-2", "[&>div]:bg-gradient-to-r [&>div]:from-purple-600 [&>div]:to-blue-600")}
                />
              </div>

              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  {upload?.progress_stage === "downloading" || (upload?.progress_percent ?? 0) >= 8 ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-purple-600" />
                  ) : (
                    <Cloud className="h-4 w-4 shrink-0 opacity-40" />
                  )}
                  Download recording from Dropbox
                </li>
                <li className="flex items-center gap-2">
                  {upload?.progress_stage === "uploading" || (upload?.progress_percent ?? 0) >= 20 ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-purple-600" />
                  ) : (
                    <Youtube className="h-4 w-4 shrink-0 opacity-40" />
                  )}
                  Upload to your YouTube channel
                </li>
              </ul>

              {polling ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Do not close this window until the upload finishes. Large recordings may take several minutes.
                  </p>
                  {(upload?.progress_stage === "queued" ||
                    upload?.progress_stage === "pending" ||
                    upload?.status === "pending") && (
                    <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
                      Waiting for the upload to start — this usually begins within a few seconds. If it stays
                      here more than a minute, tap Retry upload after closing, or contact support.
                    </p>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {failed && onRetry ? (
            <Button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
            >
              {retrying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Retrying…
                </>
              ) : (
                <>
                  <Youtube className="h-4 w-4" />
                  Retry upload
                </>
              )}
            </Button>
          ) : null}
          <Button
            type="button"
            variant={inProgress ? "secondary" : "outline"}
            onClick={onClose}
            disabled={inProgress && !failed && !published}
          >
            {published || failed ? "Close" : "Upload in progress…"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
