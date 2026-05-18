"use client"

import { Loader2, Radio, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"

type GoLiveConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isConfirming?: boolean
}

export default function GoLiveConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isConfirming = false,
}: GoLiveConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !isConfirming && onOpenChange(next)}>
      <DialogContent className="max-w-md gap-0 border-border bg-card p-0 overflow-hidden sm:rounded-2xl [&>button]:hidden">
        <div className="flex flex-col items-center px-6 pt-8 pb-6 text-center sm:px-8">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg shadow-purple-500/25">
            <Radio className="h-7 w-7 text-white" aria-hidden />
          </div>
          <DialogTitle className="text-xl font-semibold leading-snug text-foreground sm:text-2xl">
            Are you sure you want to go live on YouTube?
          </DialogTitle>
          <DialogDescription className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Starting the livestream will begin streaming resources and billing usage.
          </DialogDescription>

          <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-xl border-border"
              disabled={isConfirming}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-11 flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
              disabled={isConfirming}
              onClick={onConfirm}
            >
              {isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Starting…
                </>
              ) : (
                "Yes, Let's Go Live"
              )}
            </Button>
          </div>

          <p className="mt-6 flex items-start justify-center gap-2 text-xs leading-snug text-muted-foreground">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-500" aria-hidden />
            <span>No charges or resources will be used until you confirm.</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
