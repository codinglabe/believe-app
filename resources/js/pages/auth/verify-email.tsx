"use client"
import { Button } from "@/components/ui/button"
import type React from "react"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, CheckCircle } from "lucide-react"
import { Link, useForm } from "@inertiajs/react"
import { route } from "ziggy-js"

interface Props {
  status?: string
}

export default function VerifyEmail({ status }: Props) {
  const { post, processing } = useForm({})

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post(route("verification.send"))
  }

    return (
        <FrontendLayout>
    <div className="min-h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-6 my-10 md:my-24">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
            <CardDescription>
              We've sent a verification link to your email address. Please check your inbox and click the link to verify
              your account.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {status === "verification-link-sent" && (
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-400">
                  A new verification link has been sent to your email address.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={submit} className="space-y-4">
              <Button type="submit" disabled={processing} className="w-full">
                {processing ? "Sending..." : "Resend Verification Email"}
              </Button>
            </form>

            <div className="text-center">
              <Link
                href={route("logout")}
                method="post"
                as="button"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline"
              >
                Log Out
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
            </div>
            </FrontendLayout>
  )
}
