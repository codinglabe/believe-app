"use client"

import { ChevronDown } from "lucide-react"

type PushNotificationBannerProps = {
    title: string
    body?: string
    source?: string
    onClick?: () => void
}

/** In-app banner styled like the Windows / Believe push notification (see product screenshot). */
export function PushNotificationBanner({ title, body, source, onClick }: PushNotificationBannerProps) {
    const timeLabel = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    const sourceLabel =
        source?.trim() ||
        (typeof window !== "undefined" ? window.location.hostname : "Believe In Unity")

    return (
        <button
            type="button"
            onClick={onClick}
            className="flex w-[min(100vw-2rem,22rem)] items-center gap-3 rounded-sm bg-[#2d1b4d] p-3 text-left text-white shadow-[0_8px_28px_rgba(0,0,0,0.45)] ring-1 ring-white/10 transition hover:bg-[#362456] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
            <img
                src="/favicon-96x96.png"
                alt=""
                className="h-10 w-10 flex-shrink-0 object-contain"
                width={40}
                height={40}
            />
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-0.5 text-[11px] leading-none text-white/75">
                    <span>{timeLabel}</span>
                    <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
                </div>
                <p className="mt-1 text-sm font-semibold leading-snug text-white">{title}</p>
                {body && body !== title && (
                    <p className="mt-0.5 text-sm font-normal leading-snug text-white/90">{body}</p>
                )}
                <p className="mt-1.5 text-xs leading-none text-white/65">{sourceLabel}</p>
            </div>
        </button>
    )
}
