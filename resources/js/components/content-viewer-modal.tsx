"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/chat/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

interface ContentViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  notification: {
    title: string
    body: string
    type: string
    meta?: Record<string, any>
    timestamp: string
  } | null
}

export function ContentViewerModal({ open, onOpenChange, notification }: ContentViewerModalProps) {
  if (!notification) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{notification.title}</DialogTitle>
            <Badge variant="secondary">{notification.type}</Badge>
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4">
            <div
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: notification.body }}
            />

            {notification.meta?.image_url && (
              <div className="rounded-lg overflow-hidden">
                <img
                  src={notification.meta.image_url || "/placeholder.svg"}
                  alt={notification.title}
                  className="w-full h-auto"
                />
              </div>
            )}

            {notification.meta?.tags && notification.meta.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {notification.meta.tags.map((tag: string, index: number) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Received: {new Date(notification.timestamp).toLocaleString()}
            </p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
