"use client"

import { Head, useForm, Link } from "@inertiajs/react"
import { LoaderCircle, Mail, CheckCircle } from "lucide-react"
import { FormEventHandler } from "react"
import LivestockLogo from "@/components/livestock/LivestockLogo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import LivestockLayout from "@/layouts/livestock/LivestockLayout"

interface VerifyEmailProps {
    status?: string
}

export default function LivestockVerifyEmail({ status }: VerifyEmailProps) {
    const { post, processing } = useForm({})

    const submit: FormEventHandler = (e) => {
        e.preventDefault()
        post("/email/verification-notification")
    }

    return (
        <LivestockLayout>
            <Head title="Verify Your Email - Bida Livestock" />
            
            <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8">
                    <Card className="bg-white dark:bg-gray-800 shadow-xl border border-amber-200 dark:border-amber-800/50">
                        <CardHeader className="text-center">
                            <div className="flex justify-center mb-6">
                                <LivestockLogo size="lg" />
                            </div>
                            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-full flex items-center justify-center mb-4">
                                <Mail className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                            </div>
                            <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                                Verify Your Email
                            </CardTitle>
                            <CardDescription className="text-base mt-2">
                                We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {status === "verification-link-sent" && (
                                <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
                                    <CheckCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    <AlertDescription className="text-amber-800 dark:text-amber-200">
                                        A new verification link has been sent to your email address.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <form onSubmit={submit} className="space-y-4">
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                                >
                                    {processing ? (
                                        <>
                                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="mr-2 h-4 w-4" />
                                            Resend Verification Email
                                        </>
                                    )}
                                </Button>
                            </form>

                            <div className="text-center pt-4 border-t border-amber-200 dark:border-amber-800/50">
                                <Link
                                    href="/logout"
                                    method="post"
                                    as="button"
                                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                                >
                                    Log Out
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </LivestockLayout>
    )
}



