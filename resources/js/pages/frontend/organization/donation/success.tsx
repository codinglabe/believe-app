import { motion } from "framer-motion"
import {
    CheckCircleIcon,
    HomeIcon,
    UserIcon,
    CalendarIcon,
    DollarSignIcon,
    ReceiptTextIcon,
    BuildingIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Link } from "@inertiajs/react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
interface Donation {
    amount: number;
    donation_date: string;
    transaction_id: string;
    organization?: {
        name?: string;
    };
    message?: string;
}

interface DonationSuccessPageProps {
    donation: Donation;
}

export default function DonationSuccessPage({ donation }: DonationSuccessPageProps) {
    // Placeholder data - in a real app, this would come from props or a server fetch
    const donationDetails = {
        amount: "$"+Number(donation.amount).toFixed(2),
        date: donation.donation_date,
        transactionId: donation.transaction_id,
        organization: donation?.organization?.name,
        message: donation?.message,
    }

    const containerVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: "spring" as const,
                damping: 15,
                stiffness: 100,
                staggerChildren: 0.1,
                delayChildren: 0.2,
            },
        },
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    }

    const iconVariants = {
        hidden: { scale: 0, rotate: -180, opacity: 0 },
        visible: {
            scale: 1,
            rotate: 0,
            opacity: 1,
            transition: {
                type: "spring" as const,
                stiffness: 260,
                damping: 20,
                duration: 0.8,
            },
        },
    }

    return (
        <FrontendLayout>
            <div className="flex flex-col items-center justify-center my-12">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="w-full max-w-2xl min-h-56 rounded-2xl bg-white p-8 text-center shadow-xl dark:bg-gray-900 md:p-12 border border-gray-100 dark:border-gray-800"
                >
                    <motion.div variants={iconVariants} className="mb-6 flex justify-center">
                        <CheckCircleIcon className="h-28 w-28 text-emerald-500 md:h-36 md:w-36" />
                    </motion.div>
                    <motion.h1
                        variants={itemVariants}
                        className="mb-4 text-4xl font-extrabold text-gray-900 dark:text-gray-50 md:text-5xl leading-tight"
                    >
                        Donation Successful!
                    </motion.h1>
                    <motion.p
                        variants={itemVariants}
                        className="mb-8 text-xl text-gray-600 dark:text-gray-400 md:text-2xl max-w-prose mx-auto"
                    >
                        Thank you for your generous contribution. Your support makes a real difference!
                    </motion.p>

                    <motion.div variants={itemVariants} className="mb-8">
                        <Card className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center justify-center">
                                    <ReceiptTextIcon className="mr-2 h-6 w-6 text-purple-600 dark:text-purple-400" />
                                    Donation Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4 text-left text-gray-700 dark:text-gray-300 p-6">
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center">
                                        <DollarSignIcon className="mr-3 h-5 w-5 text-green-600 dark:text-green-400" />
                                        Amount:
                                    </span>
                                    <span className="font-semibold text-gray-900 dark:text-gray-50 text-lg">{donationDetails.amount}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center">
                                        <CalendarIcon className="mr-3 h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        Date:
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-gray-50">{donationDetails.date}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center">
                                        <ReceiptTextIcon className="mr-3 h-5 w-5 text-purple-600 dark:text-purple-400" />
                                        Transaction ID:
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-gray-50">{donationDetails.transactionId}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center">
                                        <BuildingIcon className="mr-3 h-5 w-5 text-orange-600 dark:text-orange-400" />
                                        Organization:
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-gray-50">{donationDetails.organization}</span>
                                </div>
                                <Separator className="my-2 bg-gray-200 dark:bg-gray-700" />
                                <p className="text-center text-gray-600 dark:text-gray-400 italic">{donationDetails.message}</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <Separator className="my-8 bg-gray-200 dark:bg-gray-700" />

                    <div className="flex flex-col gap-6 md:flex-row md:justify-center">
                        <motion.div variants={itemVariants}>
                            <Link
                                href="/"
                                className="flex flex-col items-center justify-center p-4 rounded-lg
              text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-50
              transition-colors duration-200 group"
                            >
                                <HomeIcon className="h-8 w-8 mb-2 group-hover:scale-110 transition-transform duration-220" />
                                <span className="text-lg font-medium">Go to Home</span>
                            </Link>
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <Link
                                href="/profile"
                                className="flex flex-col items-center justify-center p-4 rounded-lg
              text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-50
              transition-colors duration-200 group"
                            >
                                <UserIcon className="h-8 w-8 mb-2 group-hover:scale-110 transition-transform duration-220" />
                                <span className="text-lg font-medium">View Profile</span>
                            </Link>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </FrontendLayout>
    )
}
