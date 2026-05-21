"use client"

import { useEffect } from "react"
import { Radio, Shield } from "lucide-react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

type GoLiveConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isConfirming?: boolean
}

/**
 * Host must confirm before cloud relay starts (billing / resources).
 * Uses AlertDialog (portal to document) with focus guards disabled so the VDO iframe
 * keeps receiving clicks after the modal closes.
 */
export default function GoLiveConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isConfirming = false,
}: GoLiveConfirmDialogProps) {
  useEffect(() => {
    if (!open) {
      document.body.style.removeProperty("pointer-events")
      document.body.style.removeProperty("overflow")
    }
  }, [open])

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="max-w-md gap-0 border-border bg-card p-0 shadow-xl sm:rounded-2xl"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center sm:px-8">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-600/25 to-blue-600/25 ring-1 ring-purple-500/30">
            <Radio className="h-7 w-7 text-purple-600 dark:text-purple-400" aria-hidden />
          </div>

          <AlertDialogTitle className="text-lg font-semibold leading-snug text-foreground sm:text-xl">
            Are you sure you want to go live on YouTube?
          </AlertDialogTitle>

          <AlertDialogDescription className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Starting the livestream will begin streaming resources and billing usage.
          </AlertDialogDescription>

          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" aria-hidden />
            <span>No charges or resources will be used until you confirm.</span>
          </p>

          <div className="mt-8 flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-center sm:gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-xl border-border sm:max-w-[9.5rem]"
              disabled={isConfirming}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-11 flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 sm:max-w-[11rem]"
              disabled={isConfirming}
              onClick={handleConfirm}
            >
              {isConfirming ? "Starting…" : "Yes, Let's Go Live"}
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
