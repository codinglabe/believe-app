"use client"

import LivestockDashboardLayout from "@/layouts/livestock/LivestockDashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Link, router, Head, useForm } from "@inertiajs/react"
import { useState } from "react"
import { 
    Eye, 
    DollarSign, 
    Calendar, 
    CheckCircle, 
    Clock, 
    XCircle, 
    TrendingUp,
    Package,
    MapPin,
    User,
    CheckCircle2
} from "lucide-react"
import { format } from "date-fns"
import { route } from "ziggy-js"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { showSuccessToast, showErrorToast } from '@/lib/toast'

interface Payout {
    id: number
    amount: number
    currency: string
    status: string
    created_at: string
    paid_at: string | null
    buyer_confirmation: string | null
    buyer_confirmation_notes: string | null
    buyer_confirmed_at: string | null
    seller: {
        id: number
        name: string
        email: string
    } | null
    listing: {
        id: number
        title: string
        price: number
    } | null
    animal: {
        id: number
        species: string
        breed: string
        ear_tag: string | null
        primary_photo: {
            url: string
        } | null
    } | null
}

interface BuyerPayoutsProps {
    payouts: {
        data: Payout[]
        links: { url: string | null; label: string; active: boolean }[]
        current_page: number
        last_page: number
        total: number
    }
    stats: {
        total: number
        pending_confirmation: number
        confirmed: number
        paid: number
    }
    filters: {
        status?: string
    }
}

export default function BuyerPayouts({ payouts, stats, filters }: BuyerPayoutsProps) {
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all')
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
    const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null)

    const { data, setData, post, processing, errors } = useForm({
        notes: '',
    })

    const handleStatusChange = (status: string) => {
        const actualStatus = status === 'all' ? '' : status
        setSelectedStatus(status)
        const params: Record<string, string> = {}
        if (actualStatus) params.status = actualStatus
        
        router.get(route('buyer.payouts'), params, {
            preserveState: true,
            replace: true
        })
    }

    const handleConfirmClick = (payout: Payout) => {
        setSelectedPayout(payout)
        setData('notes', '')
        setConfirmDialogOpen(true)
    }

    const handleConfirmSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedPayout) return

        post(route('buyer.payouts.confirm', selectedPayout.id), {
            onSuccess: () => {
                showSuccessToast('Payment confirmed successfully. Seller will receive payout.')
                setConfirmDialogOpen(false)
                setSelectedPayout(null)
            },
            onError: () => {
                showErrorToast('Failed to confirm payment. Please try again.')
            }
        })
    }

    const getStatusConfig = (status: string, buyerConfirmation: string | null) => {
        if (buyerConfirmation === 'confirmed') {
            return {
                label: 'Confirmed',
                color: 'bg-green-500',
                icon: CheckCircle2,
                bgColor: 'bg-green-50 dark:bg-green-900/20',
                borderColor: 'border-green-200 dark:border-green-800',
                textColor: 'text-green-600 dark:text-green-400'
            }
        }
        
        switch (status) {
            case 'paid':
                return {
                    label: 'Paid',
                    color: 'bg-green-500',
                    icon: CheckCircle,
                    bgColor: 'bg-green-50 dark:bg-green-900/20',
                    borderColor: 'border-green-200 dark:border-green-800',
                    textColor: 'text-green-600 dark:text-green-400'
                }
            case 'pending':
                return {
                    label: 'Pending Confirmation',
                    color: 'bg-amber-500',
                    icon: Clock,
                    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
                    borderColor: 'border-amber-200 dark:border-amber-800',
                    textColor: 'text-amber-600 dark:text-amber-400'
                }
            case 'failed':
                return {
                    label: 'Failed',
                    color: 'bg-red-500',
                    icon: XCircle,
                    bgColor: 'bg-red-50 dark:bg-red-900/20',
                    borderColor: 'border-red-200 dark:border-red-800',
                    textColor: 'text-red-600 dark:text-red-400'
                }
            case 'cancelled':
                return {
                    label: 'Cancelled',
                    color: 'bg-gray-500',
                    icon: XCircle,
                    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
                    borderColor: 'border-gray-200 dark:border-gray-800',
                    textColor: 'text-gray-600 dark:text-gray-400'
                }
            default:
                return {
                    label: status,
                    color: 'bg-gray-500',
                    icon: Clock,
                    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
                    borderColor: 'border-gray-200 dark:border-gray-800',
                    textColor: 'text-gray-600 dark:text-gray-400'
                }
        }
    }

    return (
        <LivestockDashboardLayout>
            <Head title="Payout Requests - Buyer Dashboard" />
            
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payout Requests</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Confirm payments after inspecting your purchased animals
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Filter */}
                        <Select value={selectedStatus} onValueChange={handleStatusChange}>
                            <SelectTrigger className="w-[180px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                <Calendar className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="pending">Pending Confirmation</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Requests</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                        {stats.total}
                                    </p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Confirmation</p>
                                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                                        {stats.pending_confirmation}
                                    </p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                    <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Confirmed</p>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                                        {stats.confirmed}
                                    </p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Paid</p>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                                        {stats.paid}
                                    </p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Payouts Grid */}
                {payouts.data.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {payouts.data.map((payout) => {
                            const statusConfig = getStatusConfig(payout.status, payout.buyer_confirmation)
                            const StatusIcon = statusConfig.icon
                            const needsConfirmation = payout.status === 'pending' && !payout.buyer_confirmation

                            return (
                                <Card 
                                    key={payout.id}
                                    className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-gray-200 dark:border-gray-800 overflow-hidden"
                                >
                                    {/* Status Indicator Bar */}
                                    <div className={`h-1 ${statusConfig.bgColor} ${statusConfig.borderColor} border-b`} />
                                    
                                    <CardHeader className="pb-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                                    {payout.animal?.species} - {payout.animal?.breed}
                                                </CardTitle>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge 
                                                        variant="outline"
                                                        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 ${statusConfig.bgColor} ${statusConfig.borderColor} ${statusConfig.textColor}`}
                                                    >
                                                        <StatusIcon className="h-3.5 w-3.5" />
                                                        <span>{statusConfig.label}</span>
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    
                                    <CardContent className="space-y-4">
                                        {/* Animal Photo */}
                                        {payout.animal?.primary_photo?.url && (
                                            <div className="relative w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                                                <img
                                                    src={payout.animal.primary_photo.url}
                                                    alt={payout.animal.species}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}

                                        {/* Amount */}
                                        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                            <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 flex items-center justify-center shrink-0">
                                                <DollarSign className="h-4 w-4 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Amount</p>
                                                <p className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-600 mt-0.5">
                                                    {payout.currency} {payout.amount.toLocaleString()}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Seller Info */}
                                        {payout.seller && (
                                            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                                <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                                    <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Seller</p>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate mt-0.5">
                                                        {payout.seller.name}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Date */}
                                        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                            <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                                <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</p>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5">
                                                    {format(new Date(payout.created_at), 'MMM dd, yyyy')}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Confirmation Notes */}
                                        {payout.buyer_confirmation_notes && (
                                            <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                                <p className="text-xs font-medium text-green-800 dark:text-green-300 mb-1">Your Notes:</p>
                                                <p className="text-xs text-green-700 dark:text-green-400">{payout.buyer_confirmation_notes}</p>
                                            </div>
                                        )}

                                        {/* Action Button */}
                                        {needsConfirmation && (
                                            <Button
                                                onClick={() => handleConfirmClick(payout)}
                                                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                                            >
                                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                                Confirm Payment
                                            </Button>
                                        )}

                                        {payout.buyer_confirmation === 'confirmed' && payout.status === 'pending' && (
                                            <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                                <p className="text-xs font-medium text-green-800 dark:text-green-300 text-center">
                                                    Payment Confirmed - Awaiting Seller Payout
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                ) : (
                    <Card className="border-gray-200 dark:border-gray-800">
                        <CardContent className="p-16 text-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <DollarSign className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                                </div>
                                <div>
                                    <p className="text-xl font-semibold text-gray-900 dark:text-white mb-1.5">No payout requests found</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {selectedStatus !== 'all' ? `No payouts with status "${selectedStatus}"` : "You don't have any payout requests yet"}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Pagination */}
                {payouts.last_page > 1 && (
                    <Card className="border-gray-200 dark:border-gray-800 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Showing <span className="font-semibold text-gray-900 dark:text-white">
                                        {((payouts.current_page - 1) * payouts.per_page || 0) + 1}
                                    </span> to <span className="font-semibold text-gray-900 dark:text-white">
                                        {Math.min(payouts.current_page * payouts.per_page || 0, payouts.total)}
                                    </span> of <span className="font-semibold text-gray-900 dark:text-white">
                                        {payouts.total}
                                    </span> payouts
                                </div>
                                <div className="flex items-center gap-2 flex-wrap justify-center">
                                    {payouts.links.map((link, index) => (
                                        <Button
                                            key={index}
                                            variant={link.active ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => {
                                                if (link.url) {
                                                    const url = new URL(link.url)
                                                    const params = new URLSearchParams(url.search)
                                                    router.get(route('buyer.payouts'), Object.fromEntries(params), {
                                                        preserveState: true,
                                                        replace: true
                                                    })
                                                }
                                            }}
                                            disabled={!link.url || link.active}
                                            className={link.active ? "bg-primary hover:bg-primary/90" : ""}
                                        >
                                            <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Confirm Payment Dialog */}
                <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                    <DialogContent>
                        <form onSubmit={handleConfirmSubmit}>
                            <DialogHeader>
                                <DialogTitle>Confirm Payment After Inspection</DialogTitle>
                                <DialogDescription>
                                    Please confirm that you have inspected the animal and it meets your expectations. 
                                    Once confirmed, the seller will receive their payout.
                                </DialogDescription>
                            </DialogHeader>
                            
                            {selectedPayout && (
                                <div className="space-y-4 py-4">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Animal Details:</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {selectedPayout.animal?.species} - {selectedPayout.animal?.breed}
                                        </p>
                                        {selectedPayout.animal?.ear_tag && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                Ear Tag: {selectedPayout.animal.ear_tag}
                                            </p>
                                        )}
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white mt-2">
                                            Amount: {selectedPayout.currency} {selectedPayout.amount.toLocaleString()}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="notes">Inspection Notes (Optional)</Label>
                                        <Textarea
                                            id="notes"
                                            value={data.notes}
                                            onChange={(e) => setData('notes', e.target.value)}
                                            rows={4}
                                            placeholder="Add any notes about the inspection, animal condition, etc."
                                            className="bg-white dark:bg-gray-800"
                                        />
                                        {errors.notes && (
                                            <p className="text-sm text-red-500">{errors.notes}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setConfirmDialogOpen(false)
                                        setSelectedPayout(null)
                                        setData('notes', '')
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                                >
                                    {processing ? 'Confirming...' : 'Confirm Payment'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </LivestockDashboardLayout>
    )
}






