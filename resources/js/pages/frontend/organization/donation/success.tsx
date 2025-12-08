import { motion } from "framer-motion"
import {
    CheckCircle2,
    Home,
    User,
    Calendar,
    DollarSign,
    Receipt,
    Building2,
    Heart,
    Download,
    Share2,
    ArrowRight,
    Sparkles,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Link, Head } from "@inertiajs/react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"

interface Donation {
    id: number
    amount: number
    donation_date: string
    transaction_id: string
    frequency: string
    status: string
    payment_method: string
    message?: string
    organization?: {
        id: number
        name?: string
        image?: string
    }
    user?: {
        name?: string
        email?: string
    }
}

interface DonationSuccessPageProps {
    donation: Donation
}

export default function DonationSuccessPage({ donation }: DonationSuccessPageProps) {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(amount)
    }

    const isRecurring = donation.frequency && donation.frequency !== 'one-time'
    const donationDetails = {
        amount: formatAmount(donation.amount),
        date: formatDate(donation.donation_date),
        transactionId: donation.transaction_id,
        organization: donation?.organization?.name || 'Organization',
        message: donation?.message,
        frequency: donation.frequency,
        status: donation.status,
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.2,
            },
        },
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                ease: "easeOut"
            },
        },
    }

    const iconVariants = {
        hidden: { scale: 0, rotate: -180, opacity: 0 },
        visible: {
            scale: 1,
            rotate: 0,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 260,
                damping: 20,
                duration: 0.8,
            },
        },
    }

    const handleDownloadReceipt = () => {
        // TODO: Implement receipt download functionality
        console.log('Download receipt for donation:', donation.id)
    }

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: 'I just made a donation!',
                text: `I donated ${donationDetails.amount} to ${donationDetails.organization}`,
                url: window.location.href,
            }).catch(() => {})
        }
    }

    return (
        <FrontendLayout>
            <Head title="Donation Successful - Thank You!" />
            
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-8"
                    >
                        {/* Success Header Card */}
                        <motion.div variants={itemVariants}>
                            <Card className="border-0 shadow-2xl bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20 overflow-hidden">
                                <div className="relative">
                                    {/* Decorative background pattern */}
                                    <div className="absolute inset-0 opacity-5">
                                        <div className="absolute inset-0" style={{
                                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                                        }} />
                                    </div>
                                    
                                    <CardContent className="relative p-8 md:p-12 text-center">
                                        <motion.div variants={iconVariants} className="mb-6 flex justify-center">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-green-400 rounded-full blur-2xl opacity-30 animate-pulse" />
                                                <CheckCircle2 className="relative h-24 w-24 md:h-32 md:w-32 text-green-500 dark:text-green-400" strokeWidth={2} />
                                            </div>
                                        </motion.div>
                                        
                                        <motion.h1
                                            variants={itemVariants}
                                            className="mb-4 text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight"
                                        >
                                            Thank You for Your
                                            <span className="block text-green-600 dark:text-green-400 mt-2">
                                                Generous Donation!
                                            </span>
                                        </motion.h1>
                                        
                                        <motion.p
                                            variants={itemVariants}
                                            className="mb-8 text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed"
                                        >
                                            Your contribution is making a real difference. We're incredibly grateful for your support in helping us create positive change.
                                        </motion.p>

                                        {isRecurring && (
                                            <motion.div variants={itemVariants} className="mb-6">
                                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-4 py-2 text-sm font-semibold">
                                                    <Heart className="h-4 w-4 mr-2" />
                                                    Recurring Donation Active
                                                </Badge>
                                            </motion.div>
                                        )}
                                    </CardContent>
                                </div>
                            </Card>
                        </motion.div>

                        {/* Donation Details Card */}
                        <motion.div variants={itemVariants}>
                            <Card className="border border-gray-200 dark:border-gray-700 shadow-lg">
                                <CardContent className="p-6 md:p-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            <Receipt className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                            Donation Details
                                        </h2>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleShare}
                                                className="hidden sm:flex"
                                            >
                                                <Share2 className="h-4 w-4 mr-2" />
                                                Share
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleDownloadReceipt}
                                            >
                                                <Download className="h-4 w-4 mr-2" />
                                                Receipt
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid gap-6 md:grid-cols-2">
                                        {/* Amount - Highlighted */}
                                        <div className="md:col-span-2">
                                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                                            <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Donation Amount</p>
                                                            <p className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mt-1">
                                                                {donationDetails.amount}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {isRecurring && (
                                                        <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-300">
                                                            {donationDetails.frequency}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Organization */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                                                <Building2 className="h-4 w-4" />
                                                Organization
                                            </div>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {donationDetails.organization}
                                            </p>
                                        </div>

                                        {/* Date */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                                                <Calendar className="h-4 w-4" />
                                                Donation Date
                                            </div>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {donationDetails.date}
                                            </p>
                                        </div>

                                        {/* Transaction ID */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                                                <Receipt className="h-4 w-4" />
                                                Transaction ID
                                            </div>
                                            <p className="text-sm font-mono text-gray-700 dark:text-gray-300 break-all">
                                                {donationDetails.transactionId}
                                            </p>
                                        </div>

                                        {/* Status */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                                                <CheckCircle2 className="h-4 w-4" />
                                                Status
                                            </div>
                                            <Badge 
                                                className={
                                                    donationDetails.status === 'completed' || donationDetails.status === 'active'
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                                }
                                            >
                                                {donationDetails.status.charAt(0).toUpperCase() + donationDetails.status.slice(1)}
                                            </Badge>
                                        </div>

                                        {/* Message */}
                                        {donationDetails.message && (
                                            <div className="md:col-span-2 space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    <Heart className="h-4 w-4" />
                                                    Your Message
                                                </div>
                                                <p className="text-gray-700 dark:text-gray-300 italic bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                                                    "{donationDetails.message}"
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Action Buttons */}
                        <motion.div variants={itemVariants}>
                            <Card className="border border-gray-200 dark:border-gray-700">
                                <CardContent className="p-6">
                                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                        <Button
                                            asChild
                                            size="lg"
                                            className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
                                        >
                                            <Link href="/">
                                                <Home className="h-5 w-5 mr-2" />
                                                Back to Home
                                            </Link>
                                        </Button>
                                        
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="lg"
                                            className="w-full sm:w-auto border-2"
                                        >
                                            <Link href="/profile/donations">
                                                <User className="h-5 w-5 mr-2" />
                                                View My Donations
                                                <ArrowRight className="h-5 w-5 ml-2" />
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Thank You Message */}
                        <motion.div variants={itemVariants}>
                            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                                <CardContent className="p-6 text-center">
                                    <div className="flex items-center justify-center gap-2 mb-3">
                                        <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            Your Impact Matters
                                        </h3>
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
                                        Every donation helps us move closer to our mission. You'll receive a confirmation email shortly with your receipt and tax information.
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </FrontendLayout>
    )
}
