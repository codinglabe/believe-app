"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, DollarSign, User, Mail, CheckCircle, Clock, XCircle, Ban } from "lucide-react"

interface SoldShare {
  id: number
  name: string
  email: string
  node_id: string
  price: number
  status: string
  created_at: string
}

interface Props {
  soldShare: SoldShare | null
  isOpen: boolean
  onClose: () => void
}

export default function SoldShareViewModal({ soldShare, isOpen, onClose }: Props) {
  if (!soldShare) return null

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-3 w-3" />
      case "pending":
        return <Clock className="h-3 w-3" />
      case "failed":
        return <XCircle className="h-3 w-3" />
      case "canceled":
        return <Ban className="h-3 w-3" />
      default:
        return null
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "pending":
        return "secondary"
      case "failed":
        return "destructive"
      case "canceled":
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <User className="h-5 w-5 text-purple-600" />
            Sold Share Details - {soldShare.node_id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Transaction Status</p>
                <Badge variant={getStatusVariant(soldShare.status)} className="mt-1">
                  {getStatusIcon(soldShare.status)}
                  <span className="ml-1 capitalize">{soldShare.status}</span>
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Purchase Date</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(soldShare.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Buyer Information</p>
                </div>
                <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">{soldShare.name}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Mail className="h-3 w-3 text-gray-500" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">{soldShare.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Purchase Amount</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    ${Number(soldShare.price).toLocaleString()}
                  </p>
                </div>

                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Calendar className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Node ID</p>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{soldShare.node_id}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
