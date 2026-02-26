"use client"

import { Head, Link } from "@inertiajs/react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

interface Props {
  title?: string | null
  organizationName?: string | null
}

export default function GuestJoinExpired({ title, organizationName }: Props) {
  return (
    <FrontendLayout>
      <Head title="Meeting ended" />
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center max-w-md text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Meeting not available</h1>
          <p className="text-muted-foreground text-sm mb-6">
            {title && organizationName
              ? `"${title}" by ${organizationName} has ended or is not open for guests.`
              : "This meeting has ended or the invite link is no longer valid."}
          </p>
          <Link href="/">
            <Button variant="outline">Return home</Button>
          </Link>
        </div>
      </div>
    </FrontendLayout>
  )
}
