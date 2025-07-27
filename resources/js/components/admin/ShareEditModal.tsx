"use client"

import type React from "react"
import { useForm } from "@inertiajs/react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { useEffect } from "react"

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
  onSuccess: () => void
}

export default function ShareEditModal({ share, isOpen, onClose, onSuccess }: Props) {
  const { data, setData, put, processing, errors, reset } = useForm({
    cost: 0,
    sold: 0,
    remaining: 0,
    status: "open",
  })

  // Populate form when share data changes or modal opens
  useEffect(() => {
    if (share && isOpen) {
      setData({
        cost: share.cost_of_node || 0,
        sold: share.accumulate_cost || 0,
        remaining: share.reminder || 0,
        status: share.status || "open",
      })
    }
  }, [share, isOpen, setData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!share) return

    put(`/node-shares/${share.id}`, {
      onSuccess: () => {
        onSuccess()
        onClose()
        reset()
      },
    })
  }

  const handleClose = () => {
    onClose()
    reset()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Edit Share - {share?.node_id}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="cost" className="text-sm font-medium">
                Cost of Node
              </Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={data.cost}
                onChange={(e) => setData("cost", Number.parseFloat(e.target.value) || 0)}
                className="mt-1"
                disabled={processing}
              />
              {errors.cost && <p className="text-sm text-red-600 mt-1">{errors.cost}</p>}
            </div>

            <div>
              <Label htmlFor="sold" className="text-sm font-medium">
                Sold Amount
              </Label>
              <Input
                id="sold"
                type="number"
                step="0.01"
                value={data.sold}
                onChange={(e) => setData("sold", Number.parseFloat(e.target.value) || 0)}
                className="mt-1"
                disabled={processing}
              />
              {errors.sold && <p className="text-sm text-red-600 mt-1">{errors.sold}</p>}
            </div>

            <div>
              <Label htmlFor="remaining" className="text-sm font-medium">
                Remaining Amount
              </Label>
              <Input
                id="remaining"
                type="number"
                step="0.01"
                value={data.remaining}
                onChange={(e) => setData("remaining", Number.parseFloat(e.target.value) || 0)}
                className="mt-1"
                disabled={processing}
              />
              {errors.remaining && <p className="text-sm text-red-600 mt-1">{errors.remaining}</p>}
            </div>

            <div>
              <Label htmlFor="status" className="text-sm font-medium">
                Status
              </Label>
              <Select value={data.status} onValueChange={(value) => setData("status", value)} disabled={processing}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && <p className="text-sm text-red-600 mt-1">{errors.status}</p>}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose} disabled={processing}>
              Cancel
            </Button>
            <Button type="submit" disabled={processing}>
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Share
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
