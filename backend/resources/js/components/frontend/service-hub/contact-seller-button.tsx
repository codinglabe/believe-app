"use client"

import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { router } from "@inertiajs/react"

interface ContactSellerButtonProps {
  sellerId: number
  sellerName: string
  gigSlug: string
  gigTitle: string
    isOwner?: boolean
    sellerOrNot?: boolean
}

export function ContactSellerButton({
  sellerId,
  sellerName,
  gigSlug,
  gigTitle,
    isOwner = false,
  sellerOrNot,
}: ContactSellerButtonProps) {
    const [showDialog, setShowDialog] = useState(false)
    const [seller, setSeller] = useState(sellerOrNot);

  if (isOwner) {
    return null
  }

  const handleOpenChat = () => {
    // Store seller info in session storage for chat initialization
    sessionStorage.setItem(
      "chat_initiation",
      JSON.stringify({
        seller_id: sellerId,
        seller_name: sellerName,
        gig_slug: gigSlug,
        gig_title: gigTitle,
        initiated_at: new Date().toISOString(),
      }),
    )
    setShowDialog(false)
    router.visit("/chat")
  }

  return (
    <>
      <Button onClick={() => setShowDialog(true)} className="gap-2 h-10 bg-primary hover:bg-primary/90" size="sm">
        <MessageCircle className="h-4 w-4" />
        Contact {seller ? "Seller" : "Buyer"}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Start Chat with Seller
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium text-foreground mb-1">{sellerName}</p>
                <p className="text-sm text-muted-foreground mb-2">Service: {gigTitle}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                You can discuss service details, ask questions, and negotiate custom offers with this seller.
              </p>
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleOpenChat} className="flex-1 gap-2 bg-primary hover:bg-primary/90">
              <MessageCircle className="h-4 w-4" />
              Open Chat
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
