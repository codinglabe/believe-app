import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, DollarSign, User, FileText, CheckCircle2, Clock, XCircle, AlertCircle, ArrowUpRight, ArrowDownLeft, Plus } from 'lucide-react'
import { Activity } from './types'
import { formatDate, formatCurrency } from './utils'
import { Button } from '@/components/ui/button'

interface TransactionDetailsProps {
    activity: Activity
    onBack: () => void
}

export function TransactionDetails({ activity, onBack }: TransactionDetailsProps) {
    const isTransferSent = activity.type === 'transfer_sent'
    const isTransferReceived = activity.type === 'transfer_received'
    const isDonation = activity.type === 'donation'
    const isDeposit = activity.type === 'deposit'

    const getStatusIcon = () => {
        switch (activity.status) {
            case 'completed':
                return <CheckCircle2 className="h-5 w-5 text-green-500" />
            case 'pending':
                return <Clock className="h-5 w-5 text-yellow-500" />
            case 'failed':
                return <XCircle className="h-5 w-5 text-red-500" />
            case 'cancelled':
                return <XCircle className="h-5 w-5 text-gray-500" />
            default:
                return <AlertCircle className="h-5 w-5 text-gray-500" />
        }
    }

    const getStatusColor = () => {
        switch (activity.status) {
            case 'completed':
                return 'text-green-600 bg-green-50 border-green-200'
            case 'pending':
                return 'text-yellow-600 bg-yellow-50 border-yellow-200'
            case 'failed':
                return 'text-red-600 bg-red-50 border-red-200'
            case 'cancelled':
                return 'text-gray-600 bg-gray-50 border-gray-200'
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200'
        }
    }

    const getTypeIcon = () => {
        if (isTransferSent) {
            return <ArrowUpRight className="h-6 w-6 text-red-500" />
        } else if (isTransferReceived) {
            return <ArrowDownLeft className="h-6 w-6 text-blue-500" />
        } else if (isDeposit) {
            return <Plus className="h-6 w-6 text-emerald-500" />
        } else {
            return <ArrowDownLeft className="h-6 w-6 text-green-500" />
        }
    }

    const getTypeLabel = () => {
        if (isTransferSent) return 'Transfer Sent'
        if (isTransferReceived) return 'Transfer Received'
        if (isDeposit) return 'Deposit'
        if (isDonation) return 'Donation'
        return 'Transaction'
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="p-4 space-y-4"
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="h-8 w-8 p-0"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">Transaction Details</h2>
            </div>

            {/* Transaction Type Card */}
            <div className="p-4 rounded-lg border border-border bg-muted/50">
                <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${
                        isTransferSent 
                            ? 'bg-red-500/10' 
                            : isTransferReceived 
                            ? 'bg-blue-500/10'
                            : isDeposit
                            ? 'bg-emerald-500/10'
                            : 'bg-green-500/10'
                    }`}>
                        {getTypeIcon()}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium">{getTypeLabel()}</p>
                        <p className="text-xs text-muted-foreground">
                            {activity.transaction_id || `ID: ${activity.id}`}
                        </p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${getStatusColor()}`}>
                        {getStatusIcon()}
                        <span className="capitalize">{activity.status}</span>
                    </div>
                </div>
            </div>

            {/* Amount Card */}
            <div className="p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium">Amount</span>
                    </div>
                    <p className={`text-2xl font-bold ${
                        isTransferSent 
                            ? 'text-red-600'
                            : isTransferReceived || isDeposit
                            ? 'text-green-600'
                            : 'text-green-600'
                    }`}>
                        {isTransferSent ? '-' : '+'}${formatCurrency(activity.amount)}
                    </p>
                </div>
            </div>

            {/* Details Grid */}
            <div className="space-y-3">
                <div className="p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                            {isTransferSent ? 'Recipient' : isDonation ? 'Organization' : 'Sender'}
                        </span>
                    </div>
                    <p className="text-sm">{activity.donor_name}</p>
                    {activity.donor_email && (
                        <p className="text-xs text-muted-foreground mt-1">{activity.donor_email}</p>
                    )}
                </div>

                <div className="p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Date & Time</span>
                    </div>
                    <p className="text-sm">{formatDate(activity.date)}</p>
                </div>

                {activity.transaction_id && (
                    <div className="p-4 rounded-lg border border-border">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Transaction ID</span>
                        </div>
                        <p className="text-sm font-mono break-all">{activity.transaction_id}</p>
                    </div>
                )}

                {isDonation && activity.frequency && activity.frequency !== 'one-time' && (
                    <div className="p-4 rounded-lg border border-border">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Frequency</span>
                        </div>
                        <p className="text-sm capitalize">{activity.frequency}</p>
                    </div>
                )}

                {isTransferSent && activity.recipient_type && (
                    <div className="p-4 rounded-lg border border-border">
                        <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Recipient Type</span>
                        </div>
                        <p className="text-sm capitalize">{activity.recipient_type}</p>
                    </div>
                )}

                {activity.message && (
                    <div className="p-4 rounded-lg border border-border">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Message</span>
                        </div>
                        <p className="text-sm">{activity.message}</p>
                    </div>
                )}
            </div>
        </motion.div>
    )
}

