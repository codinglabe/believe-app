"use client"

import { useCallback, useEffect, useState } from "react"
import { Link } from "@inertiajs/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import axios from "axios"
import toast from "react-hot-toast"

type Invite = {
  id: number
  token: string
  alliance: { id: number; name: string; slug: string }
  expires_at: string | null
}

export function CareAllianceOrgInvitesInline() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get("/organization/care-alliance-invitations", {
        headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
      })
      setInvites(data.invitations ?? [])
    } catch {
      toast.error("Could not load Care Alliance invitations.")
      setInvites([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (loading || invites.length === 0) return
    if (typeof window === "undefined" || window.location.hash !== "#care-alliance-invitations") return
    const el = document.getElementById("care-alliance-invitations")
    if (el) {
      requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }))
    }
  }, [loading, invites.length])

  const csrf = typeof document !== "undefined" ? document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? "" : ""

  const respond = async (id: number, action: "accept" | "decline") => {
    try {
      await axios.post(
        `/organization/care-alliance-invitations/${id}/${action}`,
        {},
        {
          headers: {
            "X-CSRF-TOKEN": csrf,
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
        }
      )
      toast.success(action === "accept" ? "You joined the Care Alliance." : "Invitation declined.")
      await load()
    } catch {
      toast.error("Something went wrong. Try again.")
    }
  }

  if (loading || invites.length === 0) {
    return null
  }

  return (
    <Card id="care-alliance-invitations" className="scroll-mt-4 border-violet-200 dark:border-violet-900">
      <CardHeader>
        <CardTitle className="text-lg">Care Alliance invitations</CardTitle>
        <CardDescription>
          Accept or decline membership on behalf of your organization. This section is on your main dashboard after you sign in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {invites.map((inv) => (
          <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border p-3">
            <div>
              <div className="font-medium">{inv.alliance.name}</div>
              <div className="text-xs text-muted-foreground">Care Alliance membership</div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button size="sm" variant="outline" onClick={() => void respond(inv.id, "decline")}>
                Decline
              </Button>
              <Button size="sm" variant="default" onClick={() => void respond(inv.id, "accept")}>
                Accept
              </Button>
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground pt-1">
          <Link href="/organization/alliance-membership" className="text-violet-600 hover:underline dark:text-violet-400 font-medium">
            Open Alliance Membership page
          </Link>{" "}
          for full details and membership history.
        </p>
      </CardContent>
    </Card>
  )
}
