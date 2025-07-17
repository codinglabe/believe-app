// app/nodeboxes/[id]/buy/page.tsx
"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { mockNodeBoxes, type NodeBox } from "@/lib/nodebox-data"
import { BuyShareForm } from "@/components/buy-share-form"
import { Loader2 } from "lucide-react"
import { usePage } from "@inertiajs/react"
import { toast } from "@/components/frontend/ui/use-toast"

export default function BuyNodeBoxPage() {
  const params = usePage()?.props
  const nodeboxId = params?.id as string
  const [nodebox, setNodebox] = useState<NodeBox | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate fetching NodeBox data
    const foundNodebox = mockNodeBoxes.find((nb) => nb.id === nodeboxId)
    if (foundNodebox) {
      setNodebox(foundNodebox)
    } else {
      toast({
        title: "NodeBox Not Found",
        description: `No NodeBox found with ID: ${nodeboxId}`,
        variant: "destructive",
      })
    }
    setLoading(false)
  }, [nodeboxId])

  const handlePurchaseSuccess = (
    purchasedNodeboxId: string,
    amount: number,
    certificateId: string,
    buyerName: string,
    purchaseDate: string,
  ) => {
    // Update the mock data (in a real app, this would be an API call)
    const updatedNodeBoxes = mockNodeBoxes.map((nb) =>
      nb.id === purchasedNodeboxId
        ? {
          ...nb,
          currentSoldAmount: nb.currentSoldAmount + amount,
          status: nb.currentSoldAmount + amount >= nb.targetAmount ? "closed" : "open",
        }
        : nb,
    )
    // Update the local state for the current NodeBox
    setNodebox((prev) =>
      prev
        ? {
          ...prev,
          currentSoldAmount: prev.currentSoldAmount + amount,
          status: prev.currentSoldAmount + amount >= prev.targetAmount ? "closed" : "open",
        }
        : null,
    )
    // In a real application, you might want to persist updatedNodeBoxes or refetch
    // For this demo, we're just updating the local state and the mock data directly.
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-700 dark:text-gray-300">Loading NodeBox details...</span>
      </div>
    )
  }

  if (!nodebox) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">NodeBox not found.</h2>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 sm:py-12">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto"
        >
          <BuyShareForm nodebox={nodebox} onPurchaseSuccess={handlePurchaseSuccess} />
        </motion.div>
      </div>
    </div>
  )
}
