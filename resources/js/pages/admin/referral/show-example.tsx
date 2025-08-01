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
  Crown,
  Star,
  Shield,
  Info,
  Tag,
  ShoppingCart,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { showSuccessToast } from "@/lib/toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table"
import { useState, useMemo } from "react" // Added useMemo
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { motion } from "framer-motion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface UserInfo {
  id: number | null
  name: string
  email: string
}

interface BuyerDetail {
  id: number
  name: string
  email: string
  amount_invested: number
  commission_earned: number
  status: "pending" | "completed" | "canceled" | "failed"
  is_big_boss: boolean
  certificate_id: string
  transaction_id: string
  payment_method: string
  message: string | null
  purchase_date: string | null
  sold_at: string
  user_info?: UserInfo
}

interface ParentReferrer {
  id: number
  name: string
  email: string
  is_big_boss: boolean
  commission_percentage: number
}

interface ChildReferral {
  id: number
  name: string
  email: string
  commission_percentage: number
  total_sales: number
  total_earned: number
  status: string
  created_at: string
}

interface UserCommissionTransaction {
  id: number
  amount: number
  type: string
  description: string | null
  source: string | null
  created_at: string
}

// Define a type for the tree node, matching the structure from buildReferralTree
interface HierarchyNode {
  id: number
  user_name: string
  user_email: string
  is_big_boss: boolean
  level: number
  commission_percentage: number
  total_sales: number
  total_earned: number
  status: string // referral link status (active/inactive)
  created_at: string // Added for modal
  children: HierarchyNode[]
  is_direct_buyer_node?: boolean // New flag for direct buyer pseudo-nodes
  buyer_details?: BuyerDetail // Optional: link to buyer details if it's a direct buyer node
}

interface Referral {
  id: number
  referrer_name: string
  referrer_email: string
  node_boss_name: string
  node_boss_description: string
  referral_link_used: string
  full_referral_url: string
  total_amount_invested: number
  total_commission_earned: number
  commission_percentage: number
  is_big_boss: boolean
  level: number
  parent_referrer: ParentReferrer | null
  child_referrals: ChildReferral[]
  total_sales_count: number
  completed_sales_count: number
  pending_sales_count: number
  failed_sales_count: number
  status: "pending" | "completed" | "canceled" | "failed"
  referral_status: "active" | "inactive"
  created_at: string
  updated_at: string
  buyers: BuyerDetail[]
  total_user_commissions_earned: number
  user_commission_transactions: UserCommissionTransaction[]
  referral_tree_data: HierarchyNode // Added for the full hierarchy
}

interface Props {
  referral: Referral
}

export default function ReferralDetailsPage({ referral }: Props) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
      case "active":
        return <CheckCircle className="h-4 w-4" />
      case "pending":
        return <Clock className="h-4 w-4" />
      case "failed":
        return <XCircle className="h-4 w-4" />
      case "canceled":
      case "inactive":
        return <Ban className="h-4 w-4" />
      default:
        return null
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
      case "active":
        return "default"
      case "pending":
        return "secondary"
      case "failed":
        return "destructive"
      case "canceled":
        return "outline"
      case "inactive":
        return "outline"
      default:
        return "outline"
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referral.full_referral_url)
      setCopiedLink(true)
      showSuccessToast("Referral link copied to clipboard!")
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (err) {
      console.error("Failed to copy: ", err)
    }
  }

  const getReferralTypeBadge = (isBigBoss: boolean, level: number) => {
    if (isBigBoss) {
      return (
        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
          <Crown className="h-3 w-3 mr-1" />
          Big Boss
        </Badge>
      )
    } else if (level === 1) {
      return (
        <Badge variant="default" className="bg-blue-500 text-white">
          <Star className="h-3 w-3 mr-1" />
          Level {level}
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary">
          <Users className="h-3 w-3 mr-1" />
          Level {level}
        </Badge>
      )
    }
  }

  const openUserModal = (user: any) => {
    const userToDisplay = { ...user } // Create a copy to modify

    if (user.is_direct_buyer_node) {
      // If it's a direct buyer pseudo-node, use its buyer_details
      userToDisplay.referrer_name = user.buyer_details?.name || "N/A"
      userToDisplay.referrer_email = user.buyer_details?.email || "N/A"
      userToDisplay.total_amount_invested = user.buyer_details?.amount_invested
      userToDisplay.total_earned_for_modal = user.buyer_details?.commission_earned
      userToDisplay.status = user.buyer_details?.status
      userToDisplay.is_big_boss = user.buyer_details?.is_big_boss
      userToDisplay.certificate_id = user.buyer_details?.certificate_id
      userToDisplay.purchase_date = user.buyer_details?.purchase_date
      userToDisplay.node_boss_name = referral.node_boss_name // Direct buyers are always for the current node boss
      userToDisplay.full_referral_url = null // Direct buyers don't have their own referral link in this context
      userToDisplay.total_sales = null // Not applicable for a single purchase
    } else if (user.id === referral.id) {
      // This is the current referral being viewed on the page
      userToDisplay.total_earned_for_modal = referral.total_user_commissions_earned // Use the aggregated value
      userToDisplay.referrer_name = referral.referrer_name // Ensure correct name/email for current referral
      userToDisplay.referrer_email = referral.referrer_email
      userToDisplay.node_boss_name = referral.node_boss_name
      userToDisplay.full_referral_url = referral.full_referral_url
      userToDisplay.total_amount_invested = referral.total_amount_invested
      userToDisplay.total_sales = referral.total_sales_count
    } else {
      // This is a parent or child node from the hierarchy tree
      userToDisplay.total_earned_for_modal = user.total_earned // This is the direct commission for that specific referral link
      userToDisplay.referrer_name = user.user_name // Use user_name from HierarchyNode
      userToDisplay.referrer_email = user.user_email // Use user_email from HierarchyNode
      // Other properties like node_boss_name, full_referral_url might not be available for all hierarchy nodes
      // unless explicitly fetched in buildReferralTree or derived.
    }
    setSelectedUser(userToDisplay)
    setIsUserModalOpen(true)
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Memoize the augmented referral tree data
  const augmentedReferralTreeData = useMemo(() => {
    if (!referral.referral_tree_data) return null

    const treeCopy = JSON.parse(JSON.stringify(referral.referral_tree_data)) as HierarchyNode

    // Only augment the root node (the current referral being viewed)
    if (treeCopy.id === referral.id) {
      const directBuyerNodes: HierarchyNode[] = []
      const existingChildUserIds = new Set(treeCopy.children.map((child) => child.id))

      referral.buyers.forEach((buyer) => {
        // If the buyer has user_info and is not already a direct referrer child of this node,
        // add them as a direct buyer pseudo-node.
        // This allows showing direct purchases visually, even if the buyer is also a referrer
        // under a different parent in the hierarchy.
        if (buyer.user_info?.id && !existingChildUserIds.has(buyer.user_info.id)) {
          directBuyerNodes.push({
            id: buyer.user_info.id, // Use user_info.id for consistency, but it's a pseudo-node
            user_name: buyer.name,
            user_email: buyer.email,
            is_big_boss: buyer.is_big_boss,
            level: treeCopy.level + 1, // Treat them as one level below the current referrer
            commission_percentage: referral.commission_percentage, // Commission of the link they bought from
            total_sales: 1, // Represents this single purchase
            total_earned: buyer.commission_earned, // Commission earned from this specific purchase
            status: buyer.status, // Status of the purchase
            created_at: buyer.purchase_date || buyer.sold_at,
            children: [], // Direct buyers don't have children in this context
            is_direct_buyer_node: true,
            buyer_details: buyer, // Store full buyer details for modal
          })
        }
      })

      // Combine actual children (referrers) and direct buyer pseudo-nodes
      treeCopy.children = [...treeCopy.children, ...directBuyerNodes]
    }

    return treeCopy
  }, [referral])

  // Function to render a single node and its children recursively
  const renderNode = (node: HierarchyNode) => {
    const isCurrentReferral = node.id === referral.id && !node.is_direct_buyer_node // Ensure it's the actual current referral, not a pseudo-node
    const nodeBorderClass = isCurrentReferral
      ? "border-blue-500"
      : node.is_direct_buyer_node
        ? "border-red-500"
        : "border-gray-700"
    const nodeIconColor = node.is_big_boss
      ? "text-amber-400"
      : node.is_direct_buyer_node
        ? "text-red-400"
        : "text-blue-400"
    const nodeTextColor = "text-white" // All text white for contrast on dark background

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center relative"
      >
        {/* Node Box */}
        <motion.div
          whileHover={{ scale: 1.05, boxShadow: "0 8px 16px rgba(0,0,0,0.4)" }}
          whileTap={{ scale: 0.95 }}
          className={`p-1 rounded-md border cursor-pointer flex flex-col items-center gap-0.5 ${nodeBorderClass} bg-transparent`}
          onClick={() => openUserModal(node)}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              {node.is_direct_buyer_node ? (
                <ShoppingCart className={`h-5 w-5 ${nodeIconColor}`} />
              ) : node.is_big_boss ? (
                <Crown className={`h-5 w-5 ${nodeIconColor}`} />
              ) : (
                <User className={`h-5 w-5 ${nodeIconColor}`} />
              )}
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-gray-700 text-white border-gray-600">
              {node.is_direct_buyer_node ? "Direct Buyer" : node.is_big_boss ? "Big Boss" : "Regular User"}
            </TooltipContent>
          </Tooltip>
          <span className={`font-semibold text-xs ${nodeTextColor}`}>{node.user_name}</span>
          <Badge
            variant="outline"
            className={`text-[0.6rem] px-1 py-0.5 ${
              isCurrentReferral
                ? "bg-blue-700 text-white border-blue-500"
                : node.is_direct_buyer_node
                  ? "bg-red-700 text-white border-red-500"
                  : "bg-gray-700 text-gray-300 border-gray-600"
            }`}
          >
            {isCurrentReferral ? "Current" : node.is_direct_buyer_node ? "Direct Buyer" : `Level ${node.level}`}
          </Badge>
        </motion.div>

        {/* Children */}
        {node.children.length > 0 && (
          <div className="relative flex justify-center w-full mt-6">
            {/* Vertical line from parent to horizontal line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-0.5 bg-gray-700" />
            {/* Horizontal line connecting children */}
            <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-700" />

            <div className="flex justify-center gap-4 mt-6 w-full flex-wrap">
              {node.children.map((child, index) => (
                <div
                  key={child.id + (child.is_direct_buyer_node ? "-direct" : "")}
                  className="flex flex-col items-center relative"
                >
                  {/* Vertical line to child with arrow */}
                  <div className="h-6 w-0.5 bg-gray-700 relative" />
                  {renderNode(child)}
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <AppLayout>
      <Head title={`Referral Details - ${referral.referrer_name}`} />
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 m-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top duration-700">
          <div className="flex items-center gap-3">
            <Share2 className="h-8 w-8 text-orange-400" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Referral Details - {referral.referrer_name}
            </h1>
          </div>
          <Link href={route("node-referral.index")}>
            <Button
              variant="outline"
              className="w-full sm:w-auto hover:scale-105 transition-all duration-200 bg-transparent cursor-pointer"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Referrals
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Referral Link Creator Information Card */}
          <Card className="bg-gray-900 text-white shadow-lg border border-gray-700 lg:col-span-1">
            <CardHeader className="pb-4 border-b border-gray-800">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <User className="h-5 w-5 text-blue-400" />
                Referrer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col">
                <span className="font-bold text-blue-400 text-2xl">{referral.referrer_name}</span>
                <span className="text-gray-400 text-sm mt-1">{referral.referrer_email}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-400 text-sm">Referral Type:</span>
                {getReferralTypeBadge(referral.is_big_boss, referral.level)}
              </div>
              {referral.parent_referrer && (
                <div className="flex flex-col">
                  <span className="text-gray-400 text-sm">Referred by:</span>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-400" />
                    <span className="font-medium text-white">
                      {referral.parent_referrer.name} ({referral.parent_referrer.email})
                    </span>
                    {referral.parent_referrer.is_big_boss && <Crown className="h-4 w-4 text-amber-500" />}
                  </div>
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-gray-400 text-sm">Link Created:</span>
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
              <div className="flex flex-col">
                <span className="text-gray-400 text-sm">Last Updated:</span>
                <span className="font-medium text-white text-base">
                  {new Date(referral.updated_at).toLocaleDateString("en-US", {
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
                  <span className="text-gray-300 text-sm">Total Amount Invested (via this link)</span>
                  <span className="font-bold text-green-400 text-2xl">
                    ${Number(referral.total_amount_invested).toLocaleString()}
                  </span>
                </div>
                <div className="bg-purple-800/30 p-4 rounded-lg flex flex-col items-center justify-center text-center space-y-2">
                  <Percent className="h-8 w-8 text-purple-400" />
                  <span className="text-gray-300 text-sm">Total Commission Earned (User)</span>
                  <span className="font-bold text-purple-400 text-2xl">
                    $
                    {Number(referral.total_user_commissions_earned).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="flex flex-col items-center">
                  <span className="text-gray-400 text-sm">Total Sales</span>
                  <span className="font-bold text-white text-xl">{referral.total_sales_count}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-gray-400 text-sm">Completed</span>
                  <span className="font-bold text-green-400 text-xl">{referral.completed_sales_count}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-gray-400 text-sm">Pending</span>
                  <span className="font-bold text-yellow-400 text-xl">{referral.pending_sales_count}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-gray-400 text-sm">Failed</span>
                  <span className="font-bold text-red-400 text-xl">{referral.failed_sales_count}</span>
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
                  Overall Sales Status:{" "}
                  <Badge variant={getStatusVariant(referral.status)} className="text-xs px-2 py-0.5 rounded-full">
                    {getStatusIcon(referral.status)}
                    <span className="ml-1 capitalize">{referral.status}</span>
                  </Badge>
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mt-2">
                <Share2 className="h-4 w-4" />
                <span>
                  Referral Link Status:{" "}
                  <Badge
                    variant={getStatusVariant(referral.referral_status)}
                    className="text-xs px-2 py-0.5 rounded-full"
                  >
                    {getStatusIcon(referral.referral_status)}
                    <span className="ml-1 capitalize">{referral.referral_status}</span>
                  </Badge>
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Commission Breakdown Card (only if there's a difference) */}
        {referral.total_commission_earned !== referral.total_user_commissions_earned && (
          <Card className="bg-gray-900 text-white shadow-lg border border-gray-700">
            <CardHeader className="pb-4 border-b border-gray-800">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <Info className="h-5 w-5 text-cyan-400" />
                Commission Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col">
                <span className="text-gray-400 text-sm">Commission from this Referral Link:</span>
                <span className="font-bold text-green-400 text-2xl">
                  $
                  {Number(referral.total_commission_earned).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <p className="text-gray-500 text-xs mt-1">
                  This amount reflects commissions directly generated by sales through this specific link.
                </p>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-400 text-sm">Total Commission Earned by Referrer (All Sources):</span>
                <span className="font-bold text-purple-400 text-2xl">
                  $
                  {Number(referral.total_user_commissions_earned).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <p className="text-gray-500 text-xs mt-1">
                  This includes commissions from this link and any override commissions (e.g., as a Big Boss) from child
                  referrals.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Referral Hierarchy Diagram */}
        <Card className="bg-gray-900 text-white shadow-lg border border-gray-700">
          <CardHeader className="pb-4 border-b border-gray-800">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              Referral Hierarchy
            </CardTitle>
            <CardDescription className="text-gray-400">
              Visual representation of this referral link's position in the **referrer network** and **direct
              purchases**. Click on any user to see details.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex flex-col items-center justify-center min-h-[300px] relative">
            <TooltipProvider delayDuration={100}>
              {augmentedReferralTreeData ? (
                <div className="relative flex flex-col items-center w-full max-w-4xl mx-auto">
                  {renderNode(augmentedReferralTreeData)}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">No hierarchy data available for this referral.</p>
              )}
            </TooltipProvider>
          </CardContent>
        </Card>

        {/* User Commission Transactions List */}
        <Card className="bg-gray-900 text-white shadow-lg border border-gray-700">
          <CardHeader className="pb-4 border-b border-gray-800">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-yellow-400" />
              All Commission Transactions for {referral.referrer_name} ({referral.user_commission_transactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {referral.user_commission_transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold text-gray-300">Amount</TableHead>
                      <TableHead className="font-semibold text-gray-300">Source</TableHead>
                      <TableHead className="font-semibold text-gray-300">Description</TableHead>
                      <TableHead className="font-semibold text-gray-300">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referral.user_commission_transactions.map((transaction) => (
                      <TableRow key={transaction.id} className="hover:bg-gray-800/50 transition-colors duration-200">
                        <TableCell className="font-medium text-green-400">
                          $
                          {Number(transaction.amount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-gray-300 capitalize">
                          <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-full">
                            <Tag className="h-3 w-3 mr-1" />
                            {transaction.source?.replace(/_/g, " ") || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="truncate max-w-[200px] inline-block">
                                {transaction.description || "N/A"}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-700 text-white border-gray-600 max-w-xs">
                              {transaction.description || "N/A"}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {new Date(transaction.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">No commission transactions found for this referrer.</p>
            )}
          </CardContent>
        </Card>

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
                href={referral.full_referral_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-400 underline hover:text-blue-300 transition-colors text-base break-all"
              >
                {referral.full_referral_url}
              </a>
            </div>
            <Button onClick={handleCopyLink} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white">
              {copiedLink ? <CheckCircle className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copiedLink ? "Copied!" : "Copy Link"}
            </Button>
          </CardContent>
        </Card>

        {/* Child Referrals List */}
        <Card className="bg-gray-900 text-white shadow-lg border border-gray-700">
          <CardHeader className="pb-4 border-b border-gray-800">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-green-400" />
              Child Referrals ({referral.child_referrals.length})
            </CardTitle>
            <CardDescription className="text-gray-400">
              These are the direct referral links created by users who were referred by this specific link.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {referral.child_referrals.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold text-gray-300">Referrer Name</TableHead>
                      <TableHead className="font-semibold text-gray-300">Email</TableHead>
                      <TableHead className="font-semibold text-gray-300">Commission %</TableHead>
                      <TableHead className="font-semibold text-gray-300">Total Sales</TableHead>
                      <TableHead className="font-semibold text-gray-300">Total Earned</TableHead>
                      <TableHead className="font-semibold text-gray-300">Status</TableHead>
                      <TableHead className="font-semibold text-gray-300">Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referral.child_referrals.map((child) => (
                      <TableRow key={child.id} className="hover:bg-gray-800/50 transition-colors duration-200">
                        <TableCell className="font-medium text-white">{child.name}</TableCell>
                        <TableCell className="text-gray-300">{child.email}</TableCell>
                        <TableCell className="text-blue-400 font-semibold">{child.commission_percentage}%</TableCell>
                        <TableCell className="text-white">{child.total_sales}</TableCell>
                        <TableCell className="text-green-400 font-semibold">
                          $
                          {Number(child.total_earned).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(child.status)}>
                            {getStatusIcon(child.status)}
                            <span className="ml-1 capitalize">{child.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {new Date(child.created_at).toLocaleDateString("en-US", {
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
              <p className="text-gray-400 text-center py-8">No child referrals found for this link.</p>
            )}
          </CardContent>
        </Card>

        {/* Buyers List */}
        <Card className="bg-gray-900 text-white shadow-lg border border-gray-700">
          <CardHeader className="pb-4 border-b border-gray-800">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" />
              Referred Buyers ({referral.buyers.length})
            </CardTitle>
            <CardDescription className="text-gray-400">
              These are the users who made purchases directly through this specific referral link.
            </CardDescription>
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
                      <TableHead className="font-semibold text-gray-300">Type</TableHead>
                      <TableHead className="font-semibold text-gray-300">Certificate ID</TableHead>
                      <TableHead className="font-semibold text-gray-300">Payment Method</TableHead>
                      <TableHead className="font-semibold text-gray-300">Purchase Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referral.buyers.map((buyer) => (
                      <TableRow key={buyer.id} className="hover:bg-gray-800/50 transition-colors duration-200">
                        <TableCell className="font-medium text-white">
                          {buyer.name}
                          {buyer.user_info && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              ({buyer.user_info.name || "N/A"})
                            </div>
                          )}
                        </TableCell>
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
                        <TableCell>
                          {buyer.is_big_boss ? (
                            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                              <Crown className="h-3 w-3 mr-1" />
                              Big Boss
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Regular</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {buyer.certificate_id ? (
                            <Link href={route("certificate.show", buyer.id)} className="underline hover:text-blue-400">
                              {buyer.certificate_id}
                            </Link>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                        <TableCell className="text-gray-300 capitalize">{buyer.payment_method}</TableCell>
                        <TableCell className="text-gray-300">
                          {buyer.purchase_date
                            ? new Date(buyer.purchase_date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "N/A"}
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
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-gray-900 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl flex items-center gap-2">
              {selectedUser?.is_direct_buyer_node ? (
                <ShoppingCart className="h-6 w-6 text-red-400" />
              ) : selectedUser?.is_big_boss ? (
                <Crown className="h-6 w-6 text-amber-400" />
              ) : (
                <User className="h-6 w-6 text-blue-400" />
              )}
              {selectedUser?.user_name || selectedUser?.name || selectedUser?.referrer_name || "User Details"}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Detailed information about this user in the referral hierarchy.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedUser && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-gray-400 col-span-1">Name:</span>
                  <span className="col-span-3 font-medium text-white">
                    {selectedUser.user_name || selectedUser.name || selectedUser.referrer_name}
                  </span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-gray-400 col-span-1">Email:</span>
                  <span className="col-span-3 font-medium text-white">
                    {selectedUser.user_email || selectedUser.email || selectedUser.referrer_email}
                  </span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-gray-400 col-span-1">Type:</span>
                  <span className="col-span-3">
                    {selectedUser.is_direct_buyer_node ? (
                      <Badge className="bg-red-700 text-white border-red-500">Direct Buyer</Badge>
                    ) : (
                      getReferralTypeBadge(selectedUser.is_big_boss, selectedUser.level || 0)
                    )}
                  </span>
                </div>
                {selectedUser.node_boss_name && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-gray-400 col-span-1">Node Boss:</span>
                    <span className="col-span-3 font-medium text-white">{selectedUser.node_boss_name}</span>
                  </div>
                )}
                {selectedUser.commission_percentage !== undefined && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-gray-400 col-span-1">Commission %:</span>
                    <span className="col-span-3 font-medium text-green-400">{selectedUser.commission_percentage}%</span>
                  </div>
                )}
                {selectedUser.total_amount_invested !== undefined && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-gray-400 col-span-1">Total Invested:</span>
                    <span className="col-span-3 font-medium text-green-400">
                      ${Number(selectedUser.total_amount_invested).toLocaleString()}
                    </span>
                  </div>
                )}
                {selectedUser.total_earned_for_modal !== undefined && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-gray-400 col-span-1">Commission Earned:</span>
                    <span className="col-span-3 font-medium text-purple-400">
                      $
                      {Number(selectedUser.total_earned_for_modal).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
                {selectedUser.total_sales !== undefined && selectedUser.total_sales !== null && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-gray-400 col-span-1">Total Sales:</span>
                    <span className="col-span-3 font-medium text-white">{selectedUser.total_sales}</span>
                  </div>
                )}
                {selectedUser.full_referral_url && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-gray-400 col-span-1">Referral Link:</span>
                    <a
                      href={selectedUser.full_referral_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="col-span-3 font-medium text-blue-400 underline break-all"
                    >
                      {selectedUser.full_referral_url}
                    </a>
                  </div>
                )}
                {selectedUser.status && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-gray-400 col-span-1">Status:</span>
                    <span className="col-span-3">
                      <Badge variant={getStatusVariant(selectedUser.status)}>
                        {getStatusIcon(selectedUser.status)}
                        <span className="ml-1 capitalize">{selectedUser.status}</span>
                      </Badge>
                    </span>
                  </div>
                )}
                {selectedUser.created_at && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-gray-400 col-span-1">Created At:</span>
                    <span className="col-span-3 font-medium text-white">{formatDateTime(selectedUser.created_at)}</span>
                  </div>
                )}
                {selectedUser.purchase_date && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-gray-400 col-span-1">Purchase Date:</span>
                    <span className="col-span-3 font-medium text-white">
                      {formatDateTime(selectedUser.purchase_date)}
                    </span>
                  </div>
                )}
                {selectedUser.certificate_id && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-gray-400 col-span-1">Certificate ID:</span>
                    <Link
                      href={route("certificate.show", selectedUser.id)}
                      className="col-span-3 font-medium text-blue-400 underline"
                    >
                      {selectedUser.certificate_id}
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" className="bg-gray-700 text-white hover:bg-gray-600">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
