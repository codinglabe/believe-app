"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, DollarSign, TrendingUp, Unlock, Lock } from "lucide-react"

interface Share {
  id: number
  node_id: string
  cost_of_node: number
  accumulate_cost: number
  reminder: number
  status: string
}

interface Props {
  share: Share | null
  isOpen: boolean
  onClose: () => void
}

export default function ShareViewModal({ share, isOpen, onClose }: Props) {
  if (!share) return null

  const getStatusIcon = (status: string) => {
    return status === "open" ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />
  }

  const getStatusVariant = (status: string) => {
    return status === "open" ? "default" : "secondary"
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Share Details - {share.node_id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Node ID</p>
                <p className="font-semibold text-gray-900 dark:text-white">{share.node_id}</p>
              </div>
              <Badge variant={getStatusVariant(share.status)}>
                {getStatusIcon(share.status)}
                <span className="ml-1 capitalize">{share.status}</span>
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Cost of Node</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  ${Number(share.cost_of_node).toLocaleString()}
                </p>
              </div>

              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Sold Amount</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  ${Number(share.accumulate_cost).toLocaleString()}
                </p>
              </div>

              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <Calendar className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Remaining</p>
                <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  ${Number(share.reminder).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Progress</h4>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(share.accumulate_cost / share.cost_of_node) * 100}%`,
                  }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {((share.accumulate_cost / share.cost_of_node) * 100).toFixed(1)}% completed
              </p>
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
