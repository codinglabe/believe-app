"use client"

import { Head, Link } from "@inertiajs/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Button } from "@/components/frontend/ui/button"
import { Badge } from "@/components/frontend/ui/badge"
import { Label } from "@/components/frontend/ui/label"
import {
    CheckCircle,
    Gift,
    Download,
    Mail,
    Copy,
    ArrowRight,
    Sparkles,
    PartyPopper
} from "lucide-react"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { useState } from "react"
import { motion } from "framer-motion"
import jsPDF from "jspdf"

interface GiftCard {
    id: number
    voucher: string | null
    card_number: string | null
    amount: number
    brand_name: string
    currency: string
    status: string
    purchased_at: string
    expires_at: string | null
    organization?: {
        id: number
        name: string
    } | null
}

interface SuccessProps {
    giftCard: GiftCard
    sessionId: string
    user?: {
        name: string
        email: string
    } | null
}

export default function SuccessPage({ giftCard, sessionId, user }: SuccessProps) {
    const [copied, setCopied] = useState(false)

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: giftCard.currency || 'USD',
        }).format(amount)
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const formatCardNumber = (cardNumber: string | null) => {
        if (!cardNumber) return null
        // Format as XXXX-XXXX-XXXX-XXXX
        return cardNumber.replace(/(\d{4})(?=\d)/g, '$1-')
    }

    const generatePDFReceipt = () => {
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        })

        // Colors
        const primaryColor = [59, 130, 246] // Blue
        const darkGray = [55, 65, 81]
        const lightGray = [156, 163, 175]
        const green = [34, 197, 94]

        let yPos = 20

        // Header
        pdf.setFillColor(...primaryColor)
        pdf.rect(0, 0, 210, 40, 'F')

        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(24)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Gift Card Receipt', 105, 20, { align: 'center' })

        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'normal')
        pdf.text('Payment Successful', 105, 30, { align: 'center' })

        yPos = 50

        // Receipt Details Section
        pdf.setTextColor(...darkGray)
        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Receipt Details', 20, yPos)

        yPos += 10
        pdf.setDrawColor(...lightGray)
        pdf.line(20, yPos, 190, yPos)
        yPos += 8

        // Receipt Number
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(...darkGray)
        pdf.text('Receipt Number:', 20, yPos)
        pdf.setFont('helvetica', 'bold')
        const receiptNumber = giftCard.card_number
            ? `GC-${giftCard.id}-${giftCard.card_number.substring(0, 8)}`
            : `GC-${giftCard.id}-${giftCard.purchased_at.substring(0, 10).replace(/-/g, '')}`
        pdf.text(receiptNumber, 80, yPos)
        yPos += 8

        // Purchase Date
        pdf.setFont('helvetica', 'normal')
        pdf.text('Purchase Date:', 20, yPos)
        pdf.setFont('helvetica', 'bold')
        const purchaseDate = new Date(giftCard.purchased_at).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
        pdf.text(purchaseDate, 80, yPos)
        yPos += 8

        // Status
        pdf.setFont('helvetica', 'normal')
        pdf.text('Status:', 20, yPos)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(...green)
        pdf.text(giftCard.status.charAt(0).toUpperCase() + giftCard.status.slice(1), 80, yPos)
        yPos += 15

        // Gift Card Information Section
        pdf.setTextColor(...darkGray)
        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Gift Card Information', 20, yPos)

        yPos += 10
        pdf.setDrawColor(...lightGray)
        pdf.line(20, yPos, 190, yPos)
        yPos += 8

        // Brand Name
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(...darkGray)
        pdf.text('Brand:', 20, yPos)
        pdf.setFont('helvetica', 'bold')
        pdf.text(giftCard.brand_name, 80, yPos)
        yPos += 8

        // Amount
        pdf.setFont('helvetica', 'normal')
        pdf.text('Amount:', 20, yPos)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(14)
        pdf.setTextColor(...primaryColor)
        pdf.text(formatCurrency(giftCard.amount), 80, yPos)
        pdf.setFontSize(10)
        yPos += 8

        // Currency
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(...darkGray)
        pdf.text('Currency:', 20, yPos)
        pdf.setFont('helvetica', 'bold')
        pdf.text(giftCard.currency || 'USD', 80, yPos)
        yPos += 8

        // Card Number - Prominently displayed
        if (giftCard.card_number) {
            yPos += 10
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(...darkGray)
            pdf.text('Card Number:', 20, yPos)
            yPos += 8

            // Card number in a highlighted box
            pdf.setFillColor(243, 244, 246) // Light gray background
            pdf.roundedRect(20, yPos - 3, 170, 12, 3, 3, 'F')

            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(16)
            pdf.setTextColor(...primaryColor)
            const formattedCardNumber = formatCardNumber(giftCard.card_number) || giftCard.card_number
            pdf.text(formattedCardNumber, 105, yPos + 6, { align: 'center' })

            pdf.setFontSize(10)
            yPos += 15
        }

        // Voucher Code
        if (giftCard.voucher) {
            yPos += 5
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(...darkGray)
            pdf.text('Voucher Code:', 20, yPos)
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(12)
            pdf.setTextColor(...primaryColor)
            pdf.text(giftCard.voucher, 80, yPos)
            pdf.setFontSize(10)
            yPos += 8
        }

        // Expiry Date - Prominently displayed
        if (giftCard.expires_at) {
            yPos += 8
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(...darkGray)
            pdf.text('Expiry Date:', 20, yPos)
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(14)
            const expiryDate = new Date(giftCard.expires_at)
            const isExpired = expiryDate < new Date()
            pdf.setTextColor(...(isExpired ? [220, 38, 38] : [34, 197, 94])) // Red if expired, green if valid
            pdf.text(expiryDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }), 80, yPos)
            if (isExpired) {
                yPos += 6
                pdf.setFontSize(10)
                pdf.setTextColor(220, 38, 38)
                pdf.text('(Expired)', 80, yPos)
                yPos -= 6
            }
            pdf.setFontSize(10)
            yPos += 8
        }

        yPos += 10

        // Customer Information Section
        if (user) {
            pdf.setTextColor(...darkGray)
            pdf.setFontSize(14)
            pdf.setFont('helvetica', 'bold')
            pdf.text('Customer Information', 20, yPos)

            yPos += 10
            pdf.setDrawColor(...lightGray)
            pdf.line(20, yPos, 190, yPos)
            yPos += 8

            pdf.setFontSize(10)
            pdf.setFont('helvetica', 'normal')
            pdf.text('Name:', 20, yPos)
            pdf.setFont('helvetica', 'bold')
            pdf.text(user.name, 80, yPos)
            yPos += 8

            pdf.setFont('helvetica', 'normal')
            pdf.text('Email:', 20, yPos)
            pdf.setFont('helvetica', 'bold')
            pdf.text(user.email, 80, yPos)
            yPos += 15
        }

        // Organization Information (if applicable)
        if (giftCard.organization) {
            pdf.setTextColor(...darkGray)
            pdf.setFontSize(14)
            pdf.setFont('helvetica', 'bold')
            pdf.text('Organization', 20, yPos)

            yPos += 10
            pdf.setDrawColor(...lightGray)
            pdf.line(20, yPos, 190, yPos)
            yPos += 8

            pdf.setFontSize(10)
            pdf.setFont('helvetica', 'normal')
            pdf.text('Organization Name:', 20, yPos)
            pdf.setFont('helvetica', 'bold')
            pdf.text(giftCard.organization.name, 80, yPos)
            yPos += 15
        }

        yPos += 10

        // Footer
        const pageHeight = pdf.internal.pageSize.height
        yPos = pageHeight - 30

        pdf.setDrawColor(...lightGray)
        pdf.line(20, yPos, 190, yPos)
        yPos += 10

        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'italic')
        pdf.setTextColor(...lightGray)
        pdf.text('Thank you for your purchase!', 105, yPos, { align: 'center' })
        yPos += 6
        pdf.text('This is your official receipt. Please keep it for your records.', 105, yPos, { align: 'center' })
        yPos += 6
        pdf.text(`Generated on: ${new Date().toLocaleString('en-US')}`, 105, yPos, { align: 'center' })

        // Generate filename
        const date = new Date(giftCard.purchased_at).toISOString().split('T')[0]
        const filename = `Gift-Card-Receipt-${giftCard.id}-${date}.pdf`

        // Download PDF
        pdf.save(filename)
    }

    return (
        <ProfileLayout title="Payment Successful" description="Your gift card purchase has been completed">
            <Head title="Gift Card Purchase Successful" />

            <div className="space-y-6">
                {/* Success Message - Enhanced Design */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Card className="bg-gradient-to-br from-green-50 via-green-100/50 to-emerald-50 dark:from-green-900/20 dark:via-green-800/10 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 shadow-xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/30 dark:bg-green-800/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-200/30 dark:bg-emerald-800/20 rounded-full -ml-12 -mb-12 blur-2xl"></div>
                        <CardContent className="pt-8 pb-8 relative z-10">
                            <div className="flex flex-col items-center text-center">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                    className="relative mb-6"
                                >
                                    <div className="p-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg">
                                        <CheckCircle className="h-16 w-16 text-white" />
                                    </div>
                                    <div className="absolute -top-2 -right-2">
                                        <PartyPopper className="h-8 w-8 text-yellow-400 animate-bounce" />
                                    </div>
                                </motion.div>
                                <motion.h1
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-4xl font-bold mb-3 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"
                                >
                                    Payment Successful!
                                </motion.h1>
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="text-gray-600 dark:text-gray-300 text-lg mb-2"
                                >
                                    Your gift card has been purchased successfully
                                </motion.p>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mt-2"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    <span>Your gift card is ready to use!</span>
                                </motion.div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Gift Card Details */}
                    <div className="lg:col-span-2">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Card className="shadow-lg border-2">
                                <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-md">
                                            <Gift className="h-7 w-7 text-white" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-2xl">{giftCard.brand_name} Gift Card</CardTitle>
                                            <CardDescription>Your gift card details</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6">
                                    {/* Amount - Enhanced */}
                                    <div className="flex items-center justify-between p-6 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-2 border-primary/20 shadow-md">
                                        <div>
                                            <span className="text-sm text-muted-foreground block mb-1">Gift Card Value</span>
                                            <span className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                                                {formatCurrency(giftCard.amount)}
                                            </span>
                                        </div>
                                        <div className="p-4 rounded-full bg-primary/20">
                                            <Gift className="h-8 w-8 text-primary" />
                                        </div>
                                    </div>

                                    {/* Voucher Code - Enhanced */}
                                    {giftCard.voucher && (
                                        <div className="space-y-3">
                                            <Label className="text-base font-semibold block">Voucher Code</Label>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 p-5 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 font-mono text-xl font-bold text-center border-2 border-dashed border-primary/30 shadow-inner">
                                                    {giftCard.voucher}
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="lg"
                                                    className="h-14 w-14 p-0"
                                                    onClick={() => copyToClipboard(giftCard.voucher!)}
                                                >
                                                    {copied ? (
                                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                                    ) : (
                                                        <Copy className="h-5 w-5" />
                                                    )}
                                                </Button>
                                            </div>
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className={`text-sm mt-2 text-center font-medium ${
                                                    copied
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : 'text-muted-foreground'
                                                }`}
                                            >
                                                {copied ? '✓ Copied to clipboard!' : 'Click the copy button to copy this code'}
                                            </motion.p>
                                        </div>
                                    )}

                                    {/* Status and Date Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-lg border bg-card">
                                            <p className="text-xs text-muted-foreground mb-2">Status</p>
                                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 text-sm px-3 py-1">
                                                {giftCard.status === 'active' ? 'Active' : giftCard.status}
                                            </Badge>
                                        </div>
                                        <div className="p-4 rounded-lg border bg-card">
                                            <p className="text-xs text-muted-foreground mb-2">Purchased</p>
                                            <p className="font-semibold text-sm">
                                                {new Date(giftCard.purchased_at).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Actions Sidebar */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-4"
                    >
                        <Card className="shadow-lg border-2">
                            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-primary" />
                                    Next Steps
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-6">
                                <Link href={route('gift-cards.my-cards')}>
                                    <Button variant="outline" className="w-full justify-start hover:bg-primary/5 hover:border-primary/30 transition-all">
                                        <Gift className="h-4 w-4 mr-2" />
                                        View All My Cards
                                    </Button>
                                </Link>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start hover:bg-primary/5 hover:border-primary/30 transition-all"
                                    onClick={generatePDFReceipt}
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download PDF Receipt
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 border-2 border-primary/20 shadow-lg">
                            <CardContent className="pt-6">
                                <div className="space-y-2">
                                    <p className="font-semibold text-base flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-primary" />
                                        Need Help?
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        If you have any questions about your gift card, please contact our support team.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Continue Shopping - Enhanced */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex justify-center pt-4"
                >
                    <Link href={route('gift-cards.index')}>
                        <Button
                            size="lg"
                            className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg px-8"
                        >
                            Continue Shopping
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    </Link>
                </motion.div>
            </div>
        </ProfileLayout>
    )
}

