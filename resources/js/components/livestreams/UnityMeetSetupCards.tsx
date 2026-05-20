import { Link } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2, Cloud, ExternalLink, Video, Youtube } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

export interface UnityMeetSetupCardsProps {
  youtubeConnected: boolean
  youtubeCanUpload?: boolean
  youtubeReconnectUrl?: string
  youtubeChannelUrl: string | null
  dropboxConnected: boolean
  youtubeManageUrl: string
  dropboxUrl: string
  meetingsUrl: string
  createMeetingUrl: string
}

type SetupCardProps = {
  icon: LucideIcon
  iconClassName: string
  iconBgClassName: string
  accentBorderClassName: string
  title: string
  description: string
  connected?: boolean
  connectedLabel?: string
  disconnectedLabel?: string
  statusLabel?: string
  children: React.ReactNode
  footer: React.ReactNode
}

function SetupCard({
  icon: Icon,
  iconClassName,
  iconBgClassName,
  accentBorderClassName,
  title,
  description,
  connected,
  connectedLabel = "Connected",
  disconnectedLabel = "Not connected",
  statusLabel,
  children,
  footer,
}: SetupCardProps) {
  const showConnectionStatus = connected !== undefined && !statusLabel
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200",
        "hover:shadow-md hover:shadow-purple-500/5 dark:hover:shadow-purple-500/10",
        accentBorderClassName,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-80 transition-opacity group-hover:opacity-100",
          iconBgClassName.includes("red")
            ? "from-red-500 via-red-400 to-orange-400"
            : iconBgClassName.includes("sky")
              ? "from-sky-500 via-sky-400 to-blue-500"
              : "from-purple-600 via-violet-500 to-blue-600",
        )}
      />

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-white/20 shadow-sm",
              iconBgClassName,
            )}
          >
            <Icon className={cn("h-6 w-6", iconClassName)} aria-hidden />
          </div>
          {(showConnectionStatus || statusLabel) && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset shrink-0",
                statusLabel
                  ? "bg-purple-500/10 text-purple-700 ring-purple-500/25 dark:text-purple-300"
                  : connected
                    ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-400"
                    : "bg-muted/80 text-muted-foreground ring-border",
              )}
            >
              {showConnectionStatus && connected ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              ) : null}
              {statusLabel ?? (connected ? connectedLabel : disconnectedLabel)}
            </span>
          )}
        </div>

        <div className="mt-4 space-y-1">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>

        <div className="mt-5 flex-1">{children}</div>

        <div className="mt-6 border-t border-border/80 pt-5">{footer}</div>
      </div>
    </article>
  )
}

const primaryBtn =
  "w-full gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm hover:from-purple-700 hover:to-blue-700 border-0"

export default function UnityMeetSetupCards({
  youtubeConnected,
  youtubeCanUpload = true,
  youtubeReconnectUrl,
  youtubeChannelUrl,
  dropboxConnected,
  youtubeManageUrl,
  dropboxUrl,
  meetingsUrl,
  createMeetingUrl,
}: UnityMeetSetupCardsProps) {
  const youtubeNeedsReconnect = youtubeConnected && !youtubeCanUpload
  const youtubeHref = youtubeChannelUrl
    ? youtubeChannelUrl.startsWith("http")
      ? youtubeChannelUrl
      : `https://${youtubeChannelUrl}`
    : null

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Connect the services you use for streaming and recordings. You can change these anytime — stream keys and go-live controls stay on each meeting page.
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        <SetupCard
          icon={Youtube}
          iconClassName="text-white"
          iconBgClassName="bg-gradient-to-br from-red-600 to-red-500"
          accentBorderClassName="border-red-500/15 hover:border-red-500/30 dark:border-red-500/20"
          title="YouTube"
          description="Stream meetings to your channel and upload recordings from the Recordings page."
          connected={youtubeConnected || Boolean(youtubeChannelUrl)}
          connectedLabel={youtubeNeedsReconnect ? "Reconnect for upload" : "Signed in"}
          disconnectedLabel="Not connected"
          footer={
            <div className="flex flex-col gap-2">
              {youtubeNeedsReconnect && youtubeReconnectUrl ? (
                <Button asChild className={primaryBtn}>
                  <a href={youtubeReconnectUrl}>
                    Reconnect YouTube (allow upload)
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              ) : null}
              <Button asChild variant={youtubeNeedsReconnect ? "outline" : "default"} className={cn("w-full gap-2", !youtubeNeedsReconnect && primaryBtn)}>
                <Link href={youtubeManageUrl}>
                  {youtubeConnected || youtubeChannelUrl ? "Manage YouTube" : "Connect YouTube"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          }
        >
          <div className="rounded-xl border border-border/80 bg-muted/30 px-4 py-3">
            {youtubeNeedsReconnect ? (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Your account is connected for viewing, but upload permission is missing. Disconnect YouTube on the manage page, then use Reconnect above and allow all requested access.
              </p>
            ) : youtubeHref ? (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Channel</p>
                <a
                  href={youtubeHref}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline break-all"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="line-clamp-2">{youtubeChannelUrl}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No channel linked yet. Connect to enable YouTube Live from your meetings.</p>
            )}
          </div>
        </SetupCard>

        <SetupCard
          icon={Cloud}
          iconClassName="text-white"
          iconBgClassName="bg-gradient-to-br from-sky-600 to-blue-600"
          accentBorderClassName="border-sky-500/15 hover:border-sky-500/30 dark:border-sky-500/20"
          title="Cloud recordings"
          description="Save meeting recordings to Dropbox instead of only downloading locally."
          connected={dropboxConnected}
          footer={
            <Button
              asChild
              variant={dropboxConnected ? "secondary" : "default"}
              className={cn("w-full gap-2", !dropboxConnected && primaryBtn)}
            >
              <Link href={dropboxUrl}>
                {dropboxConnected ? "Open recordings" : "Connect Dropbox"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        >
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
              Automatic upload when you record in a meeting
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
              View, download, and publish from Recordings
            </li>
          </ul>
        </SetupCard>

        <SetupCard
          icon={Video}
          iconClassName="text-white"
          iconBgClassName="bg-gradient-to-br from-purple-600 to-blue-600"
          accentBorderClassName="border-purple-500/20 hover:border-purple-500/40 dark:border-purple-500/25"
          title="Meetings"
          description="Start or open a meeting, then use Go Live on the host page."
          statusLabel="Host tools"
          footer={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className={cn(primaryBtn, "flex-1")}>
                <Link href={createMeetingUrl}>
                  New meeting
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1 gap-2">
                <Link href={`${meetingsUrl}?view=meetings`}>My meetings</Link>
              </Button>
            </div>
          }
        >
          <div className="rounded-xl border border-purple-500/15 bg-gradient-to-br from-purple-500/5 to-blue-500/5 px-4 py-3 dark:from-purple-950/30 dark:to-blue-950/20">
            <p className="text-sm text-muted-foreground">
              Unity Live, YouTube, and Dropbox are configured here. Hosting controls live on each meeting&apos;s page.
            </p>
          </div>
        </SetupCard>
      </div>
    </div>
  )
}
