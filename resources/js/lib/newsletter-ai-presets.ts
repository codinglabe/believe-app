import type { LucideIcon } from "lucide-react"
import { Briefcase, Heart, PartyPopper, Zap } from "lucide-react"

export type NewsletterAiTone = "professional" | "warm" | "urgent" | "celebratory"

export const NEWSLETTER_AI_TONES: {
    id: NewsletterAiTone
    label: string
    hint: string
    Icon: LucideIcon
}[] = [
    {
        id: "professional",
        label: "Professional",
        hint: "Crisp, credible, board-ready — navy accents, tidy sections.",
        Icon: Briefcase,
    },
    {
        id: "warm",
        label: "Warm",
        hint: "Friendly community voice — soft creams, terracotta CTAs.",
        Icon: Heart,
    },
    {
        id: "urgent",
        label: "Urgent",
        hint: "Deadline-focused — bold contrast, clear “act now” CTA.",
        Icon: Zap,
    },
    {
        id: "celebratory",
        label: "Celebratory",
        hint: "Milestone energy — rich purples, gold accents, festive layout.",
        Icon: PartyPopper,
    },
]

/** Click-to-fill briefs; each sets tone + realistic prompt text for AI. */
export const NEWSLETTER_AI_BRIEF_EXAMPLES: {
    label: string
    text: string
    tone: NewsletterAiTone
}[] = [
    {
        label: "Weekly donor thank-you",
        tone: "warm",
        text: "Weekly email to donors: thank them for ongoing support, share one short impact story (meals served or families helped), one stat if it fits, soft ask to share the post or follow us, and a gentle recurring-gift reminder. Sign off with gratitude.",
    },
    {
        label: "Gala / breakfast invite",
        tone: "professional",
        text: "Formal invitation to our annual community breakfast: date, time, venue area, keynote theme, free registration, parking note, dress optional, RSVP placeholder. Clear bullet-style facts; welcoming but polished.",
    },
    {
        label: "Program launch",
        tone: "celebratory",
        text: "Announce our new after-school tutoring program for middle schoolers: who it serves, how families enroll, volunteer needs, and a “learn more” CTA. Celebratory — we have worked toward this for a year.",
    },
    {
        label: "Year-end appeal",
        tone: "urgent",
        text: "Year-end fundraising: tax-deductible before Dec 31, optional matching deadline tonight, one paragraph on mission, respectful urgency, single donate CTA. No guilt trips.",
    },
    {
        label: "Volunteer weekend",
        tone: "warm",
        text: "Recruit volunteers for Saturday park cleanups next month: 20 spots, no experience, tools and snacks provided, rain date mention, signup CTA. Community-first tone.",
    },
    {
        label: "Board / transparency update",
        tone: "professional",
        text: "Quarterly transparency email to supporters: financial stewardship headline, 3 short wins with numbers, link to annual report placeholder, volunteer spotlight sentence, footer with thanks.",
    },
    {
        label: "Giving Tuesday push",
        tone: "urgent",
        text: "Giving Tuesday: morning send with matching gift deadline at noon, one story of impact, bold CTA to donate, explain how gifts are used. Honest urgency.",
    },
    {
        label: "Impact milestone",
        tone: "celebratory",
        text: "We hit 10,000 meals this quarter — celebrate with supporters, thank volunteers and donors, share a quote from a beneficiary (written as example copy), invite them to the next event.",
    },
    {
        label: "Newsletter digest",
        tone: "professional",
        text: "Monthly digest: letter from the ED (short), two program updates, one photo caption as plain text, upcoming dates, read more links as href placeholders in HTML. Scannable sections.",
    },
    {
        label: "Re-engagement",
        tone: "warm",
        text: "We miss you — soft win-back for lapsed donors: no blame, remind them what we do together, one story, easy one-click update preferences CTA tone.",
    },
]
