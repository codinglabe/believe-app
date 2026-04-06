"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, XCircle, Ban, LinkIcon, DollarSign, User, Mail, Percent } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Referral {
  id: number
  referrer_name: string
  referred_user_email: string | null
  referred_user_name: string | null // Added buyer's name
  node_boss_name: string
  referral_link_used: string
  amount_invested: number
  commission_earned: number
  status: "pending" | "completed" | "canceled" | "failed"
  created_at: string
}

interface ReferralViewModalProps {
  isOpen: boolean
  onClose: () => void
  referral: Referral | null
}

export default function ReferralViewModal({ isOpen, onClose, referral }: ReferralViewModalProps) {
  if (!referral) return null

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "pending":
        return <Clock className="h-4 w-4" />
      case "failed":
        return <XCircle className="h-4 w-4" />
      case "canceled":
        return <Ban className="h-4 w-4" />
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
      <DialogContent className="sm:max-w-[500px] bg-gray-900 text-white p-0 rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
        <DialogHeader className="p-6 pb-4 flex flex-row items-center gap-3 border-b border-gray-800">
          <User className="h-6 w-6 text-purple-400" />
          <DialogTitle className="text-xl font-bold text-white">
            Referral Details - {referral.node_boss_name}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 grid grid-cols-1 gap-6">
          {/* Top Row: Status and Created At */}
          <div className="bg-gray-800 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-col">
              <span className="text-gray-400 text-sm mb-1">Referral Status</span>
              <Badge variant={getStatusVariant(referral.status)} className="text-sm px-3 py-1 rounded-full">
                {getStatusIcon(referral.status)}
                <span className="ml-2 capitalize">{referral.status}</span>
              </Badge>
            </div>
            <div className="flex flex-col items-start sm:items-end">
              <span className="text-gray-400 text-sm mb-1">Created At</span>
              <span className="font-medium text-white text-base">
                {new Date(referral.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          {/* Referral Link Creator Information */}
          <div className="bg-gray-800 p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-400" />
              <span className="font-semibold text-white text-lg">Referral Link Creator</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-blue-400 text-xl">{referral.referrer_name}</span>
            </div>
          </div>

          {/* Referred User (Buyer) Information */}
          <div className="bg-gray-800 p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-green-400" />
              <span className="font-semibold text-white text-lg">Referred User (Buyer)</span>
            </div>
            {referral.referred_user_name || referral.referred_user_email ? (
              <div className="flex flex-col">
                <span className="font-bold text-green-400 text-xl">{referral.referred_user_name || "N/A"}</span>
                {referral.referred_user_email && (
                  <span className="text-gray-300 text-sm flex items-center gap-1">
                    <Mail className="h-4 w-4 text-gray-500" /> {referral.referred_user_email}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No purchase made through this link yet.</p>
            )}
          </div>

          {/* Amount Invested and Commission Earned - Side by Side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-green-800/30 p-4 rounded-lg flex flex-col items-center justify-center text-center space-y-2">
              <DollarSign className="h-8 w-8 text-green-400" />
              <span className="text-gray-300 text-sm">Amount Invested</span>
              <span className="font-bold text-green-400 text-2xl">
                ${Number(referral.amount_invested).toLocaleString()}
              </span>
            </div>
            <div className="bg-purple-800/30 p-4 rounded-lg flex flex-col items-center justify-center text-center space-y-2">
              <Percent className="h-8 w-8 text-purple-400" />
              <span className="text-gray-300 text-sm">Commission Earned</span>
              <span className="font-bold text-purple-400 text-2xl">
                $
                {Number(referral.commission_earned).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* Referral Link Details */}
          <div className="bg-gray-800 p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-orange-400" />
              <span className="font-semibold text-white text-lg">Referral Link Details</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-400 text-sm">Node Boss:</span>
              <span className="font-medium text-white text-base break-words">{referral.node_boss_name}</span>
            </div>
            <div className="flex flex-col mt-2">
              <span className="text-gray-400 text-sm">Referral Link:</span>
              <a
                href={referral.referral_link_used}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-400 underline hover:text-blue-300 transition-colors text-base break-all"
              >
                {referral.referral_link_used}
              </a>
            </div>
          </div>
        </div>

        <div className="p-6 pt-4 flex justify-end border-t border-gray-800">
          <Button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-md transition-colors"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
