"use client"

import type React from "react"
import { useForm } from "@inertiajs/react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/admin/ui/textarea"
import { Loader2 } from "lucide-react"

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
  onSuccess: () => void
}

export default function SoldShareEditModal({ soldShare, isOpen, onClose, onSuccess }: Props) {
  const { data, setData, put, processing, errors, reset } = useForm({
    buyer_name: soldShare?.name || "",
    buyer_email: soldShare?.email || "",
    amount: soldShare?.price || 0,
    status: soldShare?.status || "pending",
    message: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!soldShare) return

    put(`/node-sells/${soldShare.id}`, {
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
          <DialogTitle className="text-xl font-semibold">Edit Sold Share - {soldShare?.node_id}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="buyer_name" className="text-sm font-medium">
                Buyer Name
              </Label>
              <Input
                id="buyer_name"
                type="text"
                value={data.buyer_name}
                onChange={(e) => setData("buyer_name", e.target.value)}
                className="mt-1"
                disabled={processing}
              />
              {errors.buyer_name && <p className="text-sm text-red-600 mt-1">{errors.buyer_name}</p>}
            </div>

            <div>
              <Label htmlFor="buyer_email" className="text-sm font-medium">
                Buyer Email
              </Label>
              <Input
                id="buyer_email"
                type="email"
                value={data.buyer_email}
                onChange={(e) => setData("buyer_email", e.target.value)}
                className="mt-1"
                disabled={processing}
              />
              {errors.buyer_email && <p className="text-sm text-red-600 mt-1">{errors.buyer_email}</p>}
            </div>

            <div>
              <Label htmlFor="amount" className="text-sm font-medium">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={data.amount}
                onChange={(e) => setData("amount", Number.parseFloat(e.target.value) || 0)}
                className="mt-1"
                disabled={processing}
              />
              {errors.amount && <p className="text-sm text-red-600 mt-1">{errors.amount}</p>}
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && <p className="text-sm text-red-600 mt-1">{errors.status}</p>}
            </div>

            <div>
              <Label htmlFor="message" className="text-sm font-medium">
                Message (Optional)
              </Label>
              <Textarea
                id="message"
                value={data.message}
                onChange={(e) => setData("message", e.target.value)}
                className="mt-1"
                rows={3}
                disabled={processing}
              />
              {errors.message && <p className="text-sm text-red-600 mt-1">{errors.message}</p>}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose} disabled={processing}>
              Cancel
            </Button>
            <Button type="submit" disabled={processing}>
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Sold Share
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
