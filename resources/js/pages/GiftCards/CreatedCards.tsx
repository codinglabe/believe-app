"use client"

import { Head, usePage, router, useForm } from "@inertiajs/react"
import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
    Gift,
    Calendar,
    DollarSign,
    Eye,
    User,
    Building2,
    AlertCircle,
    CheckCircle,
    FileText
} from "lucide-react"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import { format } from "date-fns"
import toast from "react-hot-toast"
import InputError from "@/components/input-error"
import { route } from "ziggy-js"

interface GiftCard {
    id: number
    voucher: string | null
    amount: number
    commission_percentage?: number | null
    total_commission?: number | null
    platform_commission?: number | null
    nonprofit_commission?: number | null
    brand: string | null
    brand_name: string | null
    currency: string
    status: string
    created_at: string
    purchased_at: string | null
    user?: {
        id: number
        name: string
        email: string
    }
    organization?: {
        id: number
        name: string
    }
}

interface CreatedCardsProps {
    giftCards: {
        data: GiftCard[]
        current_page: number
        last_page: number
        per_page: number
        total: number
    }
    organization: {
        id: number
        name: string
        gift_card_terms_approved?: boolean
        gift_card_terms_approved_at?: string
    } | null
    isAdmin?: boolean
}

export default function CreatedCardsPage({ giftCards, organization, isAdmin = false }: CreatedCardsProps) {
    const page = usePage()
    const flash = (page.props as any).flash || {}
    const { auth } = page.props as any

    // Form for gift card terms approval
    const { data, setData, patch, processing, errors } = useForm({
        gift_card_terms_approved: organization?.gift_card_terms_approved || false,
    })

    // Show success message if redirected from successful creation
    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success)
        }
        if (flash.error) {
            toast.error(flash.error)
        }
    }, [flash.success, flash.error])

    const handleTermsSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        patch(route('profile.gift-card-terms.update'), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Gift card terms updated successfully!')
                // Refresh the page to get updated organization data
                router.reload({ only: ['organization'] })
            },
            onError: (errors) => {
                console.error('Errors:', errors)
                toast.error('Failed to update gift card terms')
            }
        })
    }

    const formatCurrency = (amount: number, currency: string = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount)
    }

    // Format commission with more decimal places for very small values
    const formatCommission = (amount: number | null | undefined, currency: string = 'USD') => {
        if (amount === null || amount === undefined) return 'N/A'

        // For very small amounts (< 0.01), show more decimal places
        if (amount > 0 && amount < 0.01) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 4,
                maximumFractionDigits: 8,
            }).format(amount)
        }

        // For normal amounts, use standard currency formatting
        return formatCurrency(amount, currency)
    }

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            active: { color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200', label: 'Active' },
            inactive: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', label: 'Inactive' },
            pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200', label: 'Pending' },
            used: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', label: 'Used' },
            expired: { color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200', label: 'Expired' },
            failed: { color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200', label: 'Failed' },
        }

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

        return (
            <Badge className={config.color}>
                {config.label}
            </Badge>
        )
    }

    // Removed delete and toggle functions since all cards here are purchased

    return (
        <AppSidebarLayout>
            <Head title="Purchased Gift Cards" />

            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl py-4 px-4 md:py-6 md:px-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold flex items-center gap-2">
                                    <Gift className="h-8 w-8" />
                                    Purchased Gift Cards
                                </h1>
                                <p className="text-muted-foreground mt-1">
                                    {isAdmin
                                        ? 'All gift cards purchased for all organizations'
                                        : organization
                                            ? `Gift cards purchased for ${organization.name}`
                                            : 'All gift cards purchased for organizations'}
                                </p>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className={`grid grid-cols-1 sm:grid-cols-${isAdmin ? '4' : '3'} gap-4`}>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Purchased</CardTitle>
                            <Gift className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{giftCards.total}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Gift cards purchased
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrency(
                                    giftCards.data.length > 0
                                        ? giftCards.data.reduce((sum, card) => {
                                              const amount = typeof card.amount === 'number' ? card.amount : parseFloat(card.amount) || 0;
                                              return sum + amount;
                                          }, 0)
                                        : 0,
                                    giftCards.data[0]?.currency || 'USD'
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Combined value
                            </p>
                        </CardContent>
                    </Card>

                    {isAdmin ? (
                        <Card className="border-l-4 border-l-blue-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Platform Commission</CardTitle>
                                <DollarSign className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    {formatCommission(
                                        giftCards.data.length > 0
                                            ? giftCards.data.reduce((sum, card) => {
                                                  const commission = typeof card.platform_commission === 'number' ? card.platform_commission : parseFloat(card.platform_commission) || 0;
                                                  return sum + commission;
                                              }, 0)
                                            : 0,
                                        giftCards.data[0]?.currency || 'USD'
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Total platform earnings
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-l-4 border-l-green-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Your Commission</CardTitle>
                                <DollarSign className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {formatCommission(
                                        giftCards.data.length > 0
                                            ? giftCards.data.reduce((sum, card) => {
                                                  const commission = typeof card.nonprofit_commission === 'number' ? card.nonprofit_commission : parseFloat(card.nonprofit_commission) || 0;
                                                  return sum + commission;
                                              }, 0)
                                            : 0,
                                        giftCards.data[0]?.currency || 'USD'
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Total organization earnings
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Cards</CardTitle>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {giftCards.data.filter(c => c.status === 'active').length}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Currently active
                            </p>
                        </CardContent>
                    </Card>
                </div>

                        {/* Gift Cards List */}
                        <Card>
                    <CardHeader>
                        <CardTitle>Purchased Gift Cards ({giftCards.total})</CardTitle>
                        <CardDescription>
                            {isAdmin
                                ? 'Complete list of all gift cards purchased for all organizations'
                                : 'Complete list of all gift cards purchased for your organization'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {giftCards.data.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No purchased gift cards yet</p>
                                <p className="text-sm mt-2">
                                    Gift cards purchased for your organization will appear here
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {giftCards.data.map((card) => (
                                    <div
                                        key={card.id}
                                        className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-xl hover:shadow-md transition-all duration-300 bg-card"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="flex-shrink-0">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <Gift className="h-5 w-5 text-primary" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-base truncate">
                                                        {card.brand_name || card.brand || 'Gift Card'}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        {card.organization && (
                                                            <>
                                                                <Building2 className="h-3 w-3" />
                                                                <span>{card.organization.name}</span>
                                                            </>
                                                        )}
                                                        {card.user && (
                                                            <>
                                                                <User className="h-3 w-3 ml-2" />
                                                                <span>{card.user.name}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {card.voucher && (
                                                <p className="text-xs text-muted-foreground font-mono pl-13">
                                                    Voucher: {card.voucher}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-shrink-0">
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-primary">
                                                    {formatCurrency(card.amount, card.currency)}
                                                </p>
                                                {isAdmin && card.platform_commission !== null && card.platform_commission !== undefined && (
                                                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">
                                                        Platform: {formatCommission(card.platform_commission, card.currency)}
                                                    </p>
                                                )}
                                                {!isAdmin && card.nonprofit_commission !== null && card.nonprofit_commission !== undefined && (
                                                    <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                                                        Commission: {formatCommission(card.nonprofit_commission, card.currency)}
                                                    </p>
                                                )}
                                                {isAdmin && card.nonprofit_commission !== null && card.nonprofit_commission !== undefined && (
                                                    <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                                                        Nonprofit: {formatCommission(card.nonprofit_commission, card.currency)}
                                                    </p>
                                                )}
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(card.created_at), 'MMM dd, yyyy')}
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                {getStatusBadge(card.status)}
                                                {/* View button - all cards here are purchased */}
                                                <div className="flex gap-2 mt-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => router.visit(route('gift-cards.show.id', card.id))}
                                                        className="flex-1"
                                                    >
                                                        <Eye className="h-3 w-3 mr-1" />
                                                        View Details
                                                    </Button>
                                                </div>
                                                {card.purchased_at && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        Purchased on {format(new Date(card.purchased_at), 'MMM dd, yyyy')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pagination Info */}
                        {giftCards.total > giftCards.per_page && (
                            <div className="mt-6 text-center text-sm text-muted-foreground">
                                Showing {((giftCards.current_page - 1) * giftCards.per_page) + 1} to{' '}
                                {Math.min(giftCards.current_page * giftCards.per_page, giftCards.total)} of{' '}
                                {giftCards.total} gift cards
                            </div>
                        )}
                    </CardContent>
                </Card>
                    </div>

                    {/* Sidebar - Gift Card Terms (Organization Only) */}
                    {!isAdmin && auth?.user?.role === "organization" && (
                        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
                            <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-800 shadow-sm">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                                        <Gift className="h-5 w-5 text-pink-500" />
                                        Gift Card Program Terms
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                                        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                                            <strong>Important:</strong> Please review and approve the gift card program terms to enable gift card purchases for your organization.
                                        </AlertDescription>
                                    </Alert>

                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Summary</h4>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                                            Believe is not soliciting donations through gift card sales. Gift cards are sold at face value, and the gift card issuer pays a commission to Believe as the platform operator. Believe retains an 8% administrative and platform fee and distributes the remaining commission to participating nonprofits as earned fundraising revenue. Purchases are not tax-deductible, and all funds are reported as program-related income.
                                        </p>
                                    </div>

                                    <form onSubmit={handleTermsSubmit}>
                                        <div className="flex items-start space-x-3">
                                            <input
                                                type="checkbox"
                                                id="gift_card_terms_approved"
                                                checked={data.gift_card_terms_approved || false}
                                                onChange={(e) => setData("gift_card_terms_approved", e.target.checked)}
                                                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <Label htmlFor="gift_card_terms_approved" className="text-gray-900 dark:text-white text-sm font-medium cursor-pointer">
                                                I understand and approve the gift card program terms as described above
                                            </Label>
                                        </div>
                                        <InputError message={errors.gift_card_terms_approved} className="mt-1" />

                                        {organization?.gift_card_terms_approved && organization?.gift_card_terms_approved_at && (
                                            <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2 mt-3">
                                                <CheckCircle className="h-4 w-4" />
                                                Approved on {new Date(organization.gift_card_terms_approved_at).toLocaleDateString()}
                                            </div>
                                        )}

                                        <Button
                                            type="submit"
                                            disabled={processing}
                                            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            {processing ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <FileText className="h-4 w-4 mr-2" />
                                                    Save Terms Approval
                                                </>
                                            )}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>

        </AppSidebarLayout>
    )
}

