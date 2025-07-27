"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link } from "@inertiajs/react"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle,
  Clock,
  XCircle,
  Ban,
  DollarSign,
  User,
  Percent,
  ArrowLeft,
  Copy,
  Share2,
  Package,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { showSuccessToast } from "@/lib/toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table"

interface BuyerDetail {
  id: number
  name: string
  email: string
  amount_invested: number
  commission_earned: number
  status: "pending" | "completed" | "canceled" | "failed"
  sold_at: string
}

interface Referral {
  id: number
  referrer_name: string
  node_boss_name: string
  referral_link_used: string
  total_amount_invested: number // Total from all buyers
  total_commission_earned: number // Total from all buyers
  status: "pending" | "completed" | "canceled" | "failed"
  created_at: string
  buyers: BuyerDetail[] // Array of buyer details
}

interface Props {
  referral: Referral
}

export default function ReferralDetailsPage({ referral }: Props) {
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referral.referral_link_used)
    showSuccessToast("Referral link copied to clipboard!")
  }

  return (
    <AppLayout>
      <Head title={`Referral Details - ${referral.node_boss_name}`} />
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 m-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top duration-700">
          <div className="flex items-center gap-3">
            <Share2 className="h-8 w-8 text-orange-400" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Referral Details - {referral.node_boss_name}
            </h1>
          </div>
          <Link href={route("node-boss.show", referral.node_boss_name)}>
            <Button
              variant="outline"
              className="w-full sm:w-auto hover:scale-105 transition-all duration-200 bg-transparent cursor-pointer"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to NodeBoss
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Referral Link Creator Information Card */}
          <Card className="bg-gray-900 text-white shadow-lg border border-gray-700 lg:col-span-1">
            <CardHeader className="pb-4 border-b border-gray-800">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <User className="h-5 w-5 text-blue-400" />
                Referrer
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <div className="flex flex-col">
                <span className="font-bold text-blue-400 text-2xl">{referral.referrer_name}</span>
                <span className="text-gray-400 text-sm mt-1">Link Creator</span>
              </div>
              <div className="flex flex-col mt-4">
                <span className="text-gray-400 text-sm">Referral Link Created:</span>
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
            </CardContent>
          </Card>

          {/* Financial Details Card */}
          <Card className="bg-gray-900 text-white shadow-lg border border-gray-700 lg:col-span-2">
            <CardHeader className="pb-4 border-b border-gray-800">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-yellow-400" />
                Overall Financial Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-green-800/30 p-4 rounded-lg flex flex-col items-center justify-center text-center space-y-2">
                  <DollarSign className="h-8 w-8 text-green-400" />
                  <span className="text-gray-300 text-sm">Total Amount Invested</span>
                  <span className="font-bold text-green-400 text-2xl">
                    ${Number(referral.total_amount_invested).toLocaleString()}
                  </span>
                </div>
                <div className="bg-purple-800/30 p-4 rounded-lg flex flex-col items-center justify-center text-center space-y-2">
                  <Percent className="h-8 w-8 text-purple-400" />
                  <span className="text-gray-300 text-sm">Total Commission Earned</span>
                  <span className="font-bold text-purple-400 text-2xl">
                    $
                    {Number(referral.total_commission_earned).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mt-4">
                <Package className="h-4 w-4" />
                <span>
                  Node Boss: <span className="font-medium text-white">{referral.node_boss_name}</span>
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mt-2">
                <Clock className="h-4 w-4" />
                <span>
                  Overall Status:{" "}
                  <Badge variant={getStatusVariant(referral.status)} className="text-xs px-2 py-0.5 rounded-full">
                    {getStatusIcon(referral.status)}
                    <span className="ml-1 capitalize">{referral.status}</span>
                  </Badge>
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referral Link Details */}
        <Card className="bg-gray-900 text-white shadow-lg border border-gray-700">
          <CardHeader className="pb-4 border-b border-gray-800">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Share2 className="h-5 w-5 text-orange-400" />
              Referral Link
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            <div className="flex flex-col">
              <span className="text-gray-400 text-sm">Link:</span>
              <a
                href={referral.referral_link_used}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-400 underline hover:text-blue-300 transition-colors text-base break-all"
              >
                {referral.referral_link_used}
              </a>
            </div>
            <Button onClick={handleCopyLink} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white">
              <Copy className="mr-2 h-4 w-4" />
              Copy Link
            </Button>
          </CardContent>
        </Card>

        {/* Buyers List */}
        <Card className="bg-gray-900 text-white shadow-lg border border-gray-700">
          <CardHeader className="pb-4 border-b border-gray-800">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" />
              Referred Buyers ({referral.buyers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {referral.buyers.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold text-gray-300">Buyer Name</TableHead>
                      <TableHead className="font-semibold text-gray-300">Buyer Email</TableHead>
                      <TableHead className="font-semibold text-gray-300">Amount Invested</TableHead>
                      <TableHead className="font-semibold text-gray-300">Commission Earned</TableHead>
                      <TableHead className="font-semibold text-gray-300">Status</TableHead>
                      <TableHead className="font-semibold text-gray-300">Investment Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referral.buyers.map((buyer) => (
                      <TableRow key={buyer.id} className="hover:bg-gray-800/50 transition-colors duration-200">
                        <TableCell className="font-medium text-white">{buyer.name}</TableCell>
                        <TableCell className="text-gray-300">{buyer.email}</TableCell>
                        <TableCell className="text-green-400 font-semibold">
                          ${Number(buyer.amount_invested).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-blue-400 font-semibold">
                          $
                          {Number(buyer.commission_earned).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(buyer.status)}>
                            {getStatusIcon(buyer.status)}
                            <span className="ml-1 capitalize">{buyer.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {new Date(buyer.sold_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">No buyers have made a purchase through this link yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
