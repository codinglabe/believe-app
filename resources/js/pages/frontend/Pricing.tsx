"use client";

import { Head, Link } from "@inertiajs/react";
import FrontendLayout from "@/layouts/frontend/frontend-layout";
import { Button } from "@/components/frontend/ui/button";
import { Badge } from "@/components/frontend/ui/badge";
import { cn } from "@/lib/utils";
import {
  Check,
  ArrowRight,
  Mail,
  Bot,
  Bell,
  Users,
  Calendar,
  GraduationCap,
  ShoppingCart,
  Heart,
  FileText,
  CreditCard,
  Video,
  BarChart3,
  ShieldCheck,
  MessageSquare,
  Infinity,
  Brain,
  Headphones,
  Shield,
  DollarSign,
  ArrowBigRight,
  Sparkles,
  Store,
  Globe,
  LayoutGrid,
  Layers,
  Trophy,
  type LucideIcon,
} from "lucide-react";

interface PlanFeature {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  is_unlimited: boolean;
  sort_order?: number;
}

interface CustomField {
  key: string;
  label: string;
  value: string;
  type: string;
  icon?: string;
  description?: string;
}

interface Plan {
  id: number;
  name: string;
  price: number;
  frequency: string;
  is_popular: boolean;
  description: string | null;
  trial_days: number;
  custom_fields: CustomField[];
  features: PlanFeature[];
}

interface AddOn {
  name: string;
  price: string;
  description: string;
}

interface CurrentPlan {
  id: number;
  name: string;
  price: number;
  frequency: string;
}

interface Props {
  plans: Plan[];
  addOns: AddOn[];
  currentPlan?: CurrentPlan | null;
}

/** Brand tokens aligned with marketing comparison artwork */
const RED = "#E02424";

/** Matches header logo text (`SiteTitle`): `bg-gradient-to-r from-purple-600 to-blue-600` */
const logoGradientFrame = "bg-gradient-to-r from-purple-600 to-blue-600";
const logoGradientShadow =
  "shadow-none dark:shadow-[0_0_28px_-10px_rgba(147,51,234,0.4)]";
const logoGradientDiagonal = "bg-gradient-to-br from-purple-600 via-purple-700 to-blue-600";
const logoGradientCTA = "bg-gradient-to-r from-purple-600 to-blue-600";
const logoGlowBlur = "bg-purple-500/20 dark:bg-purple-600/25";

const COMPETITOR_ROWS: { service: string; platforms: string; cost: string; Icon: LucideIcon }[] = [
  { service: "Donations", platforms: "Donorbox / Classy", cost: "$0 – $99", Icon: Heart },
  { service: "Fundraising (Peer-to-Peer)", platforms: "GoFundMe Pro / Classy", cost: "$100 – $300", Icon: Sparkles },
  { service: "Email Marketing", platforms: "Mailchimp / SendGrid", cost: "$50 – $300", Icon: Mail },
  { service: "SMS Messaging", platforms: "Twilio / TextMagic", cost: "$20 – $200+", Icon: MessageSquare },
  { service: "CRM / Supporter Management", platforms: "Salesforce NPSP", cost: "$50 – $150", Icon: Users },
  { service: "Volunteer Management", platforms: "VolunteerHub", cost: "$30 – $100", Icon: Users },
  { service: "Events", platforms: "Eventbrite / Splash", cost: "$50 – $200", Icon: Calendar },
  { service: "Courses / Learning", platforms: "Teachable / Kajabi", cost: "$39 – $199", Icon: GraduationCap },
  { service: "Marketplace / Store", platforms: "Shopify", cost: "$39 – $105", Icon: Store },
  { service: "Payment Processing Tools", platforms: "Stripe Tools / Add-ons", cost: "$20 – $100", Icon: CreditCard },
  { service: "Community / Groups", platforms: "Circle / Mighty Networks", cost: "$39 – $150", Icon: Globe },
  { service: "Video / Meetings", platforms: "Zoom / StreamYard", cost: "$15 – $50", Icon: Video },
  { service: "Content / Media Hosting", platforms: "Vimeo / YouTube Tools", cost: "$20 – $75", Icon: LayoutGrid },
  { service: "AI Tools", platforms: "OpenAI / Jasper", cost: "$20 – $100", Icon: Bot },
  { service: "Analytics / Reporting", platforms: "Mixpanel / Tableau", cost: "$25 – $100", Icon: BarChart3 },
  { service: "Background Checks", platforms: "Checkr", cost: "Pay per use", Icon: ShieldCheck },
  { service: "Push / Engagement", platforms: "OneSignal / Braze", cost: "$15 – $100", Icon: Bell },
];

const INCLUDED_ITEMS = [
  "Donations",
  "Fundraising",
  "Email",
  "SMS",
  "CRM",
  "Volunteers",
  "Events",
  "Courses",
  "Marketplace",
  "Payments",
  "Community",
  "Video",
  "Media",
  "AI Assistant",
  "Analytics",
  "Background checks",
  "Kiosk mode",
  "Campaign pages",
];

function addOnIcon(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (n.includes("email")) return Mail;
  if (n.includes("ai")) return Brain;
  if (n.includes("sms")) return MessageSquare;
  if (n.includes("raffle")) return Trophy;
  if (n.includes("background")) return ShieldCheck;
  return Sparkles;
}

/** Colored circle behind icons — matches usage-add-ons marketing artwork */
function addOnCircleClass(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("email")) return "bg-blue-600";
  if (n.includes("ai")) return "bg-purple-600";
  if (n.includes("sms")) return "bg-emerald-600";
  if (n.includes("raffle")) return "bg-red-600";
  if (n.includes("background")) return "bg-slate-700 ring-2 ring-slate-600 dark:bg-blue-950 dark:ring-blue-800/80";
  return "bg-purple-600";
}

/** Backend may send 0/1; normalize so filtering matches PHP admin intent. */
function featureIsUnlimited(f: PlanFeature): boolean {
  const v = f.is_unlimited as unknown;
  return v === true || v === 1 || v === "1";
}

/**
 * Full feature list from the featured plan (same order as admin sort_order).
 * Previously only non-unlimited rows were shown when any finite row existed — that hid most DB features.
 */
function includedItemsFromPlan(plan: Plan | undefined): { key: string; label: string }[] {
  const raw = plan?.features;
  if (!Array.isArray(raw) || raw.length === 0) {
    return INCLUDED_ITEMS.map((label) => ({ key: label, label }));
  }
  const sorted = [...raw].sort((a, b) => {
    const ao = Number(a.sort_order ?? 0);
    const bo = Number(b.sort_order ?? 0);
    if (ao !== bo) return ao - bo;
    return a.id - b.id;
  });
  return sorted.map((f) => {
    const name = (f.name ?? "").trim() || "—";
    const label =
      featureIsUnlimited(f) && /^Unlimited\s+/i.test(name)
        ? name.replace(/^Unlimited\s+/i, "").trim() || name
        : name;
    return { key: `feature-${f.id}`, label };
  });
}

/** Email / AI / support copy from plan custom fields (same keys as admin Plans edit). */
function planHighlightLines(plan: Plan | undefined): {
  emailsLine: string;
  aiLine: string;
  supportLine: string;
} {
  const fallbacks = {
    emailsLine: "5,000 emails included every month",
    aiLine: "50,000 AI tokens every month",
    supportLine: "Priority email support",
  };
  if (!plan?.custom_fields?.length) {
    return fallbacks;
  }

  const fields = plan.custom_fields;

  const emailField = fields.find(
    (f) =>
      f.type === "number" &&
      (String(f.key).toLowerCase() === "emails_included" || /email/i.test(String(f.label ?? ""))),
  );
  let emailsLine = fallbacks.emailsLine;
  if (emailField?.value !== undefined && String(emailField.value).trim() !== "") {
    const n = Number(String(emailField.value).replace(/,/g, ""));
    if (!Number.isNaN(n) && n >= 0) {
      emailsLine = `${n.toLocaleString()} emails included every month`;
    }
  }

  const aiTokenNumber = fields.find((f) => {
    if (f.type !== "number") {
      return false;
    }
    const k = String(f.key).toLowerCase();
    return k === "ai_tokens_included" || k === "ai_tokens";
  });
  const aiTokenText = fields.find((f) => {
    if (f.type !== "text") {
      return false;
    }
    const k = String(f.key).toLowerCase();
    return k === "ai_tokens" || /ai|token/i.test(String(f.label ?? ""));
  });

  let aiLine = fallbacks.aiLine;
  if (aiTokenNumber?.value !== undefined && String(aiTokenNumber.value).trim() !== "") {
    const n = Number(String(aiTokenNumber.value).replace(/,/g, ""));
    if (!Number.isNaN(n) && n > 0) {
      aiLine = `${n.toLocaleString()} AI tokens every month`;
    }
  } else if (aiTokenText?.value?.trim()) {
    aiLine = aiTokenText.value.trim();
  }

  const supportField = fields.find(
    (f) => String(f.key).toLowerCase() === "support_level" && f.type === "text",
  );
  const supportLine =
    supportField?.value?.trim() ? supportField.value.trim() : fallbacks.supportLine;

  return { emailsLine, aiLine, supportLine };
}

/** All currency-type custom fields from admin (type must match “currency”, any casing). */
function planCurrencyCustomFields(plan: Plan | undefined): CustomField[] {
  if (!plan?.custom_fields?.length) return [];
  return plan.custom_fields.filter((f) => String(f.type ?? "").toLowerCase().trim() === "currency");
}

/** Pretty-print stored currency value (e.g. "10" / "10.00" → "$10.00"); passthrough if already has $. */
function formatCurrencyCustomFieldDisplay(raw: string): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (/^\s*\$/.test(s)) return s.trim();
  const n = Number(s.replace(/,/g, ""));
  if (!Number.isNaN(n)) {
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return s;
}

/** Reads plan custom field by slugified key (see Admin → Plans → custom field labels). */
function planCustomFieldByKey(plan: Plan | undefined, key: string): string | undefined {
  const want = key.toLowerCase();
  const f = plan?.custom_fields?.find((x) => String(x.key).toLowerCase() === want);
  const v = f?.value != null ? String(f.value).trim() : "";
  return v || undefined;
}

/**
 * Bottom comparison stats + SMS strip + card footer — optional custom fields on the featured plan.
 * Label examples (type text unless noted): "Pricing Competitor Monthly Range", "Pricing Vs Badge",
 * "Pricing Competitor Period", "Pricing Competitor Footer Label", "Pricing Difference Blurb",
 * "Pricing Vs Fragmented Label", "Pricing Sms Headline", "Pricing Sms Subtitle", "Pricing Sms Note",
 * "Pricing Card Footer Tagline"; "Pricing Usage Addons Json" (text: JSON array of {name,price,description}).
 * Benefit row: "Pricing Unlimited Access Summary", "Pricing Trial Card Copy" (overrides trial tile entirely).
 */
function pricingPageMarketingFromPlan(plan: Plan | undefined) {
  return {
    competitorRange:
      planCustomFieldByKey(plan, "pricing_competitor_monthly_range") ??
      planCustomFieldByKey(plan, "pricing_competitor_range") ??
      "$600 – $2,000+",
    competitorPeriod: planCustomFieldByKey(plan, "pricing_competitor_period") ?? "/ month",
    vsBadge:
      planCustomFieldByKey(plan, "pricing_vs_badge") ??
      planCustomFieldByKey(plan, "pricing_fragmented_badge") ??
      "$600–$2k+",
    fragmentedLabel:
      planCustomFieldByKey(plan, "pricing_vs_fragmented_label") ?? "fragmented stack",
    footerLabel:
      planCustomFieldByKey(plan, "pricing_competitor_footer_label") ??
      "Total (conservative estimate)",
    differenceBlurb:
      planCustomFieldByKey(plan, "pricing_difference_blurb") ??
      "Stop paying more for less. Use your budget for your mission, not for software.",
    smsHeadline:
      planCustomFieldByKey(plan, "pricing_sms_headline") ?? "SMS messaging (pay-as-you-go)",
    smsSubtitle:
      planCustomFieldByKey(plan, "pricing_sms_subtitle") ?? "Only pay when you send messages.",
    smsNote:
      planCustomFieldByKey(plan, "pricing_sms_note") ??
      "We show you the full cost upfront before you launch any campaign.",
    cardFooterTagline:
      planCustomFieldByKey(plan, "pricing_card_footer_tagline") ??
      "One plan. One price. Unlimited impact.",
    unlimitedAccessSummary:
      planCustomFieldByKey(plan, "pricing_unlimited_access_summary") ??
      "Donations, FundMe (Peer-to-Peer), Campaigns (Email, Social, Push)",
  };
}

function trialBenefitCardCopy(plan: Plan | undefined): string {
  const override = planCustomFieldByKey(plan, "pricing_trial_card_copy");
  if (override) {
    return override;
  }
  const days = plan?.trial_days ?? 0;
  if (days > 0) {
    return `${days}-day free trial`;
  }
  return "No free trial — real value, transparent pricing.";
}

function usageAddOnsFromPlan(plan: Plan | undefined, fallback: AddOn[]): AddOn[] {
  const raw = planCustomFieldByKey(plan, "pricing_usage_addons_json");
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return fallback;
    const out: AddOn[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const name = String(o.name ?? "").trim();
      const price = String(o.price ?? "").trim();
      const description = String(o.description ?? "").trim();
      if (name && price) out.push({ name, price, description });
    }
    return out.length > 0 ? out : fallback;
  } catch {
    return fallback;
  }
}

export default function PricingPage({ plans, addOns, currentPlan }: Props) {
  const featuredPlan = plans.find((p) => p.is_popular) ?? plans[0];
  const verificationCurrencyFields = planCurrencyCustomFields(featuredPlan);
  const includedGridItems = includedItemsFromPlan(featuredPlan);
  const highlightLines = planHighlightLines(featuredPlan);
  const pricingMarketing = pricingPageMarketingFromPlan(featuredPlan);
  const displayAddOns = usageAddOnsFromPlan(featuredPlan, addOns);

  return (
    <FrontendLayout>
      <Head title="Pricing – Nonprofit Plans | Believe In Unity" />
      <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 antialiased dark:bg-[#0A0A1A] dark:text-white">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-8 sm:py-12 md:py-14">
          {/* Header */}
          <header className="mx-auto mb-10 max-w-4xl text-center sm:mb-14 md:mb-16">
            <h1 className="mb-3 text-balance text-2xl font-bold tracking-tight text-slate-900 sm:mb-4 sm:text-4xl md:text-5xl dark:text-white">
              The True Cost of Doing More With Less
            </h1>
            <p className="text-pretty text-sm leading-relaxed text-slate-600 sm:text-base md:text-lg dark:text-white/70">
              Most organizations pay for 10+ different tools.{" "}
              <span className="font-semibold text-[#582BE8] dark:text-[#582BE8]">Believe In Unity</span>{" "}
              gives you everything in one place.
            </p>
          </header>

          {currentPlan && (
            <div className="mx-auto mb-10 flex max-w-2xl flex-col items-center justify-between gap-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-4 dark:border-[#582BE855] dark:bg-[#582BE818] sm:flex-row">
              <div className="flex items-center gap-3 text-center sm:text-left">
                <Check className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">You&apos;re subscribed</p>
                  <p className="text-sm text-slate-600 dark:text-white/70">
                    {currentPlan.name} · ${currentPlan.price}/{currentPlan.frequency}
                  </p>
                </div>
              </div>
              <Link href={route("plans.index")}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-300 text-slate-800 hover:bg-slate-100 dark:border-white/30 dark:text-white dark:hover:bg-white/10"
                >
                  Manage plan
                </Button>
              </Link>
            </div>
          )}

          {/* Main comparison */}
          <div className="relative mb-10 flex flex-col gap-6 lg:mb-16 lg:flex-row lg:items-stretch lg:gap-0">
            {/* VS badge */}
            <div
              className="absolute left-1/2 top-1/2 z-10 hidden h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-sm font-bold text-slate-800 shadow-lg dark:border-white/20 dark:bg-[#0A0A1A] dark:text-white lg:flex"
              aria-hidden
            >
              VS
            </div>

            {/* Left: competitors — gradient frame + dark interior (red-forward) */}
            <div
              className={cn(
                "flex-1 min-w-0 rounded-2xl p-[2px] flex flex-col shadow-[0_0_48px_-12px_rgba(224,36,36,0.38)]",
                "bg-gradient-to-br from-[#E02424] via-[#b91c1c] to-[#582BE8]",
              )}
            >
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-slate-200/90 bg-white dark:border-white/[0.06] dark:bg-[#0b0b18]">
                <div className="relative shrink-0 overflow-hidden px-3 py-2.5 sm:px-4 sm:py-3">
                  <div
                    className="absolute inset-0 opacity-100"
                    style={{
                      background: `linear-gradient(125deg, ${RED} 0%, #b91c1c 42%, #7f1d1d 100%)`,
                    }}
                  />
                  <div className="pointer-events-none absolute -left-8 -top-10 h-24 w-24 rounded-full bg-[#582BE8]/30 blur-2xl" />
                  <div className="pointer-events-none absolute -right-4 bottom-0 h-16 w-24 rounded-full bg-white/10 blur-2xl" />
                  <div className="relative flex flex-col items-center gap-1.5 sm:flex-row sm:justify-center sm:gap-2.5">
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-4 w-4 shrink-0 text-white/95 drop-shadow-sm sm:h-[18px] sm:w-[18px]" />
                      <span className="text-[11px] font-bold uppercase leading-snug tracking-[0.12em] text-white text-center sm:text-xs">
                        What it would cost using other platforms
                      </span>
                    </div>
                    <Badge className="border-0 bg-black/25 px-2 py-px text-[9px] font-bold uppercase tracking-wide text-white shadow-sm backdrop-blur-sm sm:text-[10px]">
                      10+ tools
                    </Badge>
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto overscroll-x-contain bg-gradient-to-b from-slate-50/80 to-rose-50/40 [-webkit-overflow-scrolling:touch] dark:from-transparent dark:to-red-950/[0.12]">
                  <table className="w-full min-w-[580px] text-xs">
                    <thead>
                      <tr className="border-b border-red-200/80 bg-red-50/90 text-left text-[9px] uppercase tracking-wider text-red-800/70 dark:border-red-500/25 dark:bg-red-950/25 dark:text-red-100/55 sm:text-[10px]">
                        <th className="px-2.5 py-2 font-semibold w-[36%] min-w-[200px] sm:px-3">Service</th>
                        <th className="px-2.5 py-2 font-semibold w-[38%] sm:px-3">Popular platforms</th>
                        <th className="px-2.5 py-2 text-right font-semibold whitespace-nowrap sm:px-3 w-[26%]">
                          Typical monthly cost
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {COMPETITOR_ROWS.map((row) => (
                        <tr
                          key={row.service}
                          className="border-b border-slate-200/90 transition-colors hover:bg-red-50/60 dark:border-white/[0.06] dark:hover:bg-red-500/[0.06]"
                        >
                          <td className="px-2.5 py-1.5 sm:px-3 sm:py-2">
                            <span className="flex items-center gap-2 text-slate-800 dark:text-white/90">
                              <span
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-red-300/70 bg-red-50 shadow-inner shadow-red-200/50 dark:border-red-500/30 dark:bg-red-500/10 dark:shadow-red-950/40 sm:h-8 sm:w-8 sm:rounded-lg"
                                aria-hidden
                              >
                                <row.Icon className="h-3.5 w-3.5 text-red-700 sm:h-4 sm:w-4 dark:text-red-200/90" />
                              </span>
                              {row.service}
                            </span>
                          </td>
                          <td className="px-2.5 py-1.5 text-slate-600 sm:px-3 sm:py-2 dark:text-white/65">
                            {row.platforms}
                          </td>
                          <td className="px-2.5 py-1.5 text-right font-semibold whitespace-nowrap tabular-nums sm:px-3 sm:py-2">
                            <span className="bg-gradient-to-br from-red-600 to-red-700 bg-clip-text text-transparent dark:from-red-300 dark:to-red-500 dark:drop-shadow-[0_0_12px_rgba(248,113,113,0.25)]">
                              {row.cost}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="relative overflow-hidden shrink-0">
                  <div
                    className="absolute inset-0 opacity-100"
                    style={{
                      background: `linear-gradient(95deg, ${RED} 0%, #991b1b 50%, #581c87 100%)`,
                    }}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_35%,rgba(255,255,255,0.07)_48%,transparent_62%)]" />
                  <div className="relative flex flex-col items-center justify-between gap-2 px-3 py-2.5 text-white sm:flex-row sm:gap-3 sm:px-4">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/95 text-center sm:text-left sm:text-[11px]">
                      {pricingMarketing.footerLabel}
                    </span>
                    <span className="text-lg font-bold tabular-nums tracking-tight text-white drop-shadow-md sm:text-xl">
                      {pricingMarketing.competitorRange}{" "}
                      <span className="text-xs font-semibold uppercase tracking-wide text-white/80 sm:text-sm">
                        {pricingMarketing.competitorPeriod}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center py-2 lg:hidden" aria-hidden>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-300 bg-slate-100 text-sm font-bold text-slate-800 shadow-lg dark:border-white/20 dark:bg-[#12122a] dark:text-white">
                VS
              </div>
            </div>

            <div className="flex lg:w-8 shrink-0 lg:block" aria-hidden />

            {/* Right: Believe In Unity — frame matches header logo gradient (purple → blue) */}
            <div className={cn("flex-1 min-w-0 rounded-2xl p-[2px] flex flex-col", logoGradientFrame, logoGradientShadow)}>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-slate-200/90 bg-white dark:border-white/[0.06] dark:bg-[#0b0b18]">
                {/* Header */}
                <div className="relative shrink-0 overflow-hidden px-3 py-3 sm:px-5 sm:py-4">
                  <div className={cn("absolute inset-0", logoGradientDiagonal)} />
                  <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-blue-500/25 blur-2xl" />
                  <div className="pointer-events-none absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-purple-400/20 blur-2xl" />
                  <div className="relative flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-amber-200/95 drop-shadow-sm" />
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-white sm:text-sm">
                        Believe In Unity
                      </span>
                    </div>
                    <Badge className="border-0 bg-blue-600/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm backdrop-blur-sm">
                      All-in-one
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-1 flex-col text-slate-900 dark:text-white">
                  {/* Price spotlight */}
                  <div className="relative border-b border-purple-200/80 px-4 pb-5 pt-6 text-center dark:border-purple-500/20 sm:px-5 sm:pb-7 sm:pt-8">
                    <div
                      className={cn(
                        "pointer-events-none absolute left-1/2 top-1/2 h-36 w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[48px]",
                        logoGlowBlur,
                      )}
                    />
                    <div className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[40px] dark:bg-blue-600/15" />
                    <div className="relative space-y-3">
                      <p
                        className="inline-flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 rounded-full border border-purple-300/60 bg-gradient-to-r from-violet-100/90 to-sky-100/80 px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-900 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)] dark:border-purple-500/25 dark:from-purple-600/15 dark:to-blue-600/10 dark:text-violet-100/90 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                      >
                        <span className="text-slate-700 dark:text-white/90">Vs.</span>
                        <span style={{ color: RED }} className="font-bold">
                          {pricingMarketing.vsBadge}
                        </span>
                        <span className="text-slate-600 dark:text-white/60">{pricingMarketing.fragmentedLabel}</span>
                      </p>

                      {featuredPlan ? (
                        <>
                          <p className="text-3xl font-bold tabular-nums tracking-tight sm:text-4xl md:text-5xl">
                            <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-blue-400">
                              ${featuredPlan.price}
                            </span>
                            <span className="text-base font-semibold text-slate-500 sm:text-lg md:text-xl dark:text-white/55">
                              {" "}
                              / {featuredPlan.frequency}
                            </span>
                          </p>
                          {verificationCurrencyFields.length > 0 ? (
                            verificationCurrencyFields.map((f, i) => {
                              const label = (f.label ?? "").trim() || "One-time fee";
                              const amount = formatCurrencyCustomFieldDisplay(String(f.value ?? ""));
                              return (
                                <p
                                  key={`verify-spot-${String(f.key ?? "")}-${i}`}
                                  className="text-sm font-medium text-slate-600 dark:text-white/75"
                                >
                                  + {label}
                                  {amount ? ` ${amount}` : " (see plan details at signup)"}
                                </p>
                              );
                            })
                          ) : (
                            <p className="text-sm font-medium text-slate-600 dark:text-white/75">
                              + organization verification (see plan details at signup)
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-lg font-semibold text-slate-600 dark:text-white/80">
                          Plans loading… check back shortly.
                        </p>
                      )}
                      <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-600 dark:text-white/60">
                        Everything your organization needs. All in one platform.
                      </p>
                    </div>
                  </div>

                  {/* Included grid */}
                  <div className="flex-1 bg-gradient-to-b from-slate-50/90 via-violet-50/40 to-sky-50/30 px-3 py-4 dark:from-transparent dark:via-purple-950/10 dark:to-blue-950/15 sm:px-4 sm:py-5">
                    <div className="mb-4 flex items-center justify-center gap-2">
                      <span className="h-px max-w-[4rem] flex-1 bg-gradient-to-r from-transparent via-violet-400/50 to-sky-400/50 dark:via-purple-500/40 dark:to-blue-500/40" />
                      <h3 className="bg-gradient-to-r from-violet-700 to-blue-700 bg-clip-text text-[11px] font-bold uppercase tracking-[0.35em] text-transparent dark:from-purple-300 dark:to-blue-300">
                        Everything included
                      </h3>
                      <span className="h-px max-w-[4rem] flex-1 bg-gradient-to-l from-transparent via-violet-400/50 to-sky-400/50 dark:via-purple-500/40 dark:to-blue-500/40" />
                    </div>
                    <div className="rounded-xl border border-violet-200/80 bg-white/90 p-3 ring-1 ring-inset ring-sky-200/50 backdrop-blur-sm dark:border-purple-500/20 dark:bg-[#12122c]/80 dark:ring-blue-500/10 sm:p-4">
                      <div className="grid grid-cols-1 gap-x-3 gap-y-2 min-[420px]:grid-cols-2 sm:grid-cols-3 sm:gap-y-2.5 sm:text-sm">
                        {includedGridItems.map((item) => (
                          <div
                            key={item.key}
                            className="flex min-w-0 items-center gap-2 text-xs text-slate-700 sm:text-sm dark:text-white/85"
                          >
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-violet-300/70 bg-gradient-to-br from-violet-100 to-sky-100 dark:border-purple-400/30 dark:from-purple-600/20 dark:to-blue-600/15"
                              aria-hidden
                            >
                              <Check className="h-3 w-3 text-violet-700 dark:text-blue-200" strokeWidth={3} />
                            </span>
                            <span className="break-words">{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Benefit tiles */}
                  <div className="grid grid-cols-2 gap-2 px-2 pb-3 sm:grid-cols-5 sm:px-3 sm:pb-4">
                    <div className="rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 to-sky-50/60 p-2.5 text-center shadow-inner shadow-violet-200/30 dark:border-purple-500/25 dark:from-purple-600/15 dark:to-blue-600/10 dark:shadow-purple-900/20 sm:p-3">
                      <Infinity className="mx-auto mb-2 h-5 w-5 text-violet-600 dark:text-blue-200" />
                      <p className="mb-1 bg-gradient-to-r from-violet-700 to-blue-700 bg-clip-text text-[10px] font-bold uppercase text-transparent dark:from-purple-300 dark:to-blue-300">
                        Unlimited access
                      </p>
                      <p className="break-words text-[10px] leading-snug text-slate-600 sm:text-[11px] dark:text-white/70">
                        {pricingMarketing.unlimitedAccessSummary}
                      </p>
                    </div>
                    <div className="rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 to-sky-50/60 p-2.5 text-center dark:border-purple-500/25 dark:from-purple-600/15 dark:to-blue-600/10 sm:p-3">
                      <Mail className="mx-auto mb-2 h-5 w-5 text-violet-600 dark:text-blue-200" />
                      <p className="mb-1 bg-gradient-to-r from-violet-700 to-blue-700 bg-clip-text text-[10px] font-bold uppercase text-transparent dark:from-purple-300 dark:to-blue-300">
                        Emails
                      </p>
                      <p className="text-[11px] leading-snug text-slate-600 dark:text-white/70">
                        {highlightLines.emailsLine}
                      </p>
                    </div>
                    <div className="rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 to-sky-50/60 p-2.5 text-center dark:border-purple-500/25 dark:from-purple-600/15 dark:to-blue-600/10 sm:p-3">
                      <Brain className="mx-auto mb-2 h-5 w-5 text-violet-600 dark:text-blue-200" />
                      <p className="mb-1 bg-gradient-to-r from-violet-700 to-blue-700 bg-clip-text text-[10px] font-bold uppercase text-transparent dark:from-purple-300 dark:to-blue-300">
                        AI tokens
                      </p>
                      <p className="text-[11px] leading-snug text-slate-600 dark:text-white/70">
                        {highlightLines.aiLine}
                      </p>
                    </div>
                    <div className="rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 to-sky-50/60 p-2.5 text-center dark:border-purple-500/25 dark:from-purple-600/15 dark:to-blue-600/10 sm:p-3">
                      <Headphones className="mx-auto mb-2 h-5 w-5 text-violet-600 dark:text-blue-200" />
                      <p className="mb-1 bg-gradient-to-r from-violet-700 to-blue-700 bg-clip-text text-[10px] font-bold uppercase text-transparent dark:from-purple-300 dark:to-blue-300">
                        Support
                      </p>
                      <p className="text-[11px] leading-snug text-slate-600 dark:text-white/70">
                        {highlightLines.supportLine}
                      </p>
                    </div>
                    <div className="col-span-2 rounded-xl border border-sky-300/80 bg-gradient-to-br from-sky-50/90 to-violet-50/70 p-2.5 text-center ring-1 ring-inset ring-sky-200/60 dark:border-blue-500/35 dark:from-blue-600/15 dark:to-purple-600/10 dark:ring-blue-400/15 sm:col-span-1 sm:p-3">
                      <Shield className="mx-auto mb-2 h-5 w-5 text-sky-600 dark:text-blue-300" />
                      <p className="mb-1 bg-gradient-to-r from-violet-700 to-blue-700 bg-clip-text text-[10px] font-bold uppercase text-transparent dark:from-purple-300 dark:to-blue-300">
                        Trial
                      </p>
                      <p className="text-[11px] leading-snug text-slate-600 dark:text-white/70">
                        {trialBenefitCardCopy(featuredPlan)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto px-3 pb-4 sm:px-4 sm:pb-5">
                    {!featuredPlan ? (
                      <Link href={route("register")} className="block">
                        <Button className="group relative w-full h-12 overflow-hidden border-0 font-semibold text-white shadow-lg transition hover:brightness-110">
                          <span className={cn("absolute inset-0 opacity-95", logoGradientCTA)} aria-hidden />
                          <span className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition group-hover:opacity-100" />
                          <span className="relative flex items-center justify-center gap-2">
                            Get started
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        </Button>
                      </Link>
                    ) : currentPlan && currentPlan.id === featuredPlan.id ? (
                      <Button
                        className="h-12 w-full border border-slate-300 bg-slate-100 font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                        disabled
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Current plan
                      </Button>
                    ) : currentPlan ? (
                      <Link href={route("plans.index")} className="block">
                        <Button className="group relative w-full h-12 overflow-hidden border-0 font-semibold text-white shadow-lg transition hover:brightness-110">
                          <span className={cn("absolute inset-0 opacity-95", logoGradientCTA)} aria-hidden />
                          <span className="relative flex items-center justify-center gap-2">
                            Switch plan
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        </Button>
                      </Link>
                    ) : (
                      <Link href={route("register")} className="block">
                        <Button className="group relative w-full h-12 overflow-hidden border-0 font-semibold text-white shadow-lg transition hover:brightness-110">
                          <span className={cn("absolute inset-0 opacity-95", logoGradientCTA)} aria-hidden />
                          <span className="relative flex items-center justify-center gap-2">
                            Get started
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        </Button>
                      </Link>
                    )}
                  </div>

                  {/* Footer strip — logo gradient */}
                  <div className="relative flex items-center justify-center gap-2 overflow-hidden px-3 py-3 text-xs font-medium text-white sm:px-4 sm:py-3.5 sm:text-sm">
                    <div className={cn("absolute inset-0", logoGradientFrame)} />
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.08)_50%,transparent_60%)]" />
                    <Heart className="relative h-4 w-4 shrink-0 fill-blue-200/90 text-purple-100 drop-shadow" />
                    <span className="relative tracking-wide">{pricingMarketing.cardFooterTagline}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary — wide red card + SMS green card on one row (md+) */}
          <div className="mb-12 flex flex-col gap-3 md:flex-row md:items-stretch md:gap-3 lg:gap-4">
            {/* Single row: The difference | Other platforms | arrow | Believe In Unity */}
            <div className="min-w-0 flex-1 rounded-xl border border-red-200/90 bg-white px-3 py-3 shadow-sm shadow-red-200/40 dark:border-red-900/55 dark:bg-[#09090f] dark:shadow-[0_0_36px_-14px_rgba(185,28,28,0.35)] sm:px-4 sm:py-4 md:px-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-0 md:justify-between lg:gap-1">
                <div className="flex min-w-0 flex-1 gap-2.5 sm:gap-3 md:max-w-[38%] lg:max-w-[34%]">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-300/60 dark:shadow-red-950/50"
                    aria-hidden
                  >
                    <DollarSign className="h-6 w-6" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-900 dark:text-white">
                      The difference
                    </p>
                    <p className="mt-1 text-xs leading-snug text-slate-600 dark:text-white/75">
                      {pricingMarketing.differenceBlurb}
                    </p>
                  </div>
                </div>

                <div className="hidden h-12 w-px shrink-0 bg-slate-200 dark:bg-white/10 md:block" aria-hidden />

                <div className="flex flex-col items-center text-center md:flex-1 md:px-3 lg:px-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-800 dark:text-white">
                    Other platforms
                  </span>
                  <span className="mt-1 text-2xl font-bold tabular-nums leading-none text-red-600 sm:text-[1.65rem] dark:text-red-500">
                    {pricingMarketing.competitorRange}
                  </span>
                  <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-white/55">
                    {pricingMarketing.competitorPeriod}
                  </span>
                </div>

                <div className="flex justify-center md:shrink-0 md:px-2">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 shadow-md shadow-purple-300/50 dark:shadow-purple-950/40"
                    aria-hidden
                  >
                    <ArrowBigRight className="h-5 w-5 text-white" strokeWidth={2} />
                  </span>
                </div>

                <div className="flex min-w-0 flex-1 flex-col border-t border-slate-200 pt-3 text-center dark:border-white/10 md:border-t-0 md:border-l md:border-slate-200 md:pt-0 md:pl-4 md:text-left md:dark:border-white/10 lg:pl-6">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-700 dark:text-purple-400">
                    Believe In Unity
                  </span>
                  {featuredPlan ? (
                    <>
                      <div className="mt-1 flex flex-wrap items-baseline justify-center gap-x-1.5 gap-y-0 md:justify-start">
                        <span className="text-2xl font-bold tabular-nums text-violet-700 sm:text-[1.65rem] dark:text-purple-400">
                          ${featuredPlan.price}
                        </span>
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-white/55">
                          / {featuredPlan.frequency}
                        </span>
                      </div>
                      {verificationCurrencyFields.length > 0 ? (
                        verificationCurrencyFields.map((f, i) => {
                          const label = (f.label ?? "").trim() || "Verification";
                          const amount = formatCurrencyCustomFieldDisplay(String(f.value ?? ""));
                          return (
                            <p
                              key={`verify-sum-${String(f.key ?? "")}-${i}`}
                              className="mt-1 text-[10px] leading-snug text-slate-500 dark:text-white/45"
                            >
                              + {label}
                              {amount ? ` ${amount} one-time` : " (see plan at signup)"}
                            </p>
                          );
                        })
                      ) : (
                        <p className="mt-1 text-[10px] leading-snug text-slate-500 dark:text-white/45">
                          + organization verification at signup
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="mt-2 text-sm font-medium text-slate-500 dark:text-white/45">
                      See plans for current pricing
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* SMS — green card, right column same line as red card on md+ */}
            <div className="flex w-full shrink-0 flex-col md:w-[min(100%,268px)] lg:w-[min(100%,288px)] xl:w-[304px]">
              <div className="flex h-full min-h-0 flex-col rounded-xl border border-emerald-200/90 bg-emerald-50/50 p-3 dark:border-emerald-600/40 dark:bg-[#0a0a12] sm:p-3.5">
                <div className="flex min-h-0 flex-1 flex-col gap-3">
                  <div className="flex gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-emerald-400/70 bg-white dark:border-emerald-400/75 dark:bg-emerald-500/[0.06]"
                      aria-hidden
                    >
                      <MessageSquare className="h-[18px] w-[18px] text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[10px] font-bold uppercase leading-snug tracking-[0.12em] text-emerald-800 dark:text-emerald-400">
                        {pricingMarketing.smsHeadline}
                      </p>
                      <p className="mt-1 text-xs leading-snug text-slate-600 dark:text-white/78">
                        {pricingMarketing.smsSubtitle}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-emerald-200/70 dark:border-white/[0.07]" aria-hidden />
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-100/80 dark:border-emerald-500/45 dark:bg-emerald-500/10">
                      <Check className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" strokeWidth={2.5} />
                    </span>
                    <p className="text-[11px] leading-snug text-slate-600 dark:text-white/62">
                      {pricingMarketing.smsNote}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Usage-based add-ons — horizontal strip (reference layout) */}
          <section className="mb-12">
            <div className="rounded-xl border border-slate-200/90 bg-white px-3 py-4 shadow-inner shadow-slate-200/50 dark:border-white/15 dark:bg-[#0a0a14] dark:shadow-black/40 sm:px-5 sm:py-5">
              <h2 className="mb-4 text-center text-xs font-bold uppercase leading-snug tracking-wide sm:text-sm">
                <span className="text-amber-600 dark:text-amber-400">Pay only when you grow</span>
                <span className="text-slate-900 dark:text-white"> — usage-based add-ons</span>
              </h2>
              <div className="overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/80 dark:[&::-webkit-scrollbar-thumb]:bg-white/15">
                <div className="flex min-w-min items-stretch justify-between gap-0 sm:min-w-0">
                  {displayAddOns.map((addOn, idx) => {
                    const Icon = addOnIcon(addOn.name);
                    return (
                      <div
                        key={`${addOn.name}-${idx}`}
                        className={cn(
                          "flex min-w-[148px] flex-1 items-center gap-3 px-3 py-1 sm:min-w-0 sm:px-4 sm:py-0",
                          idx > 0 && "border-l border-dashed border-slate-200 dark:border-white/25",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-md",
                            addOnCircleClass(addOn.name),
                          )}
                          aria-hidden
                        >
                          <Icon className="h-5 w-5 text-white" strokeWidth={2} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight text-slate-900 sm:text-sm dark:text-white">
                            {addOn.name}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-tight text-slate-600 sm:text-xs dark:text-white/75">
                            {addOn.price}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {!currentPlan && (
            <p className="mt-8 text-center text-sm text-slate-600 dark:text-white/60">
              Already have an account?{" "}
              <Link href={route("login")} className="font-medium text-[#582BE8] hover:underline dark:text-[#582BE8]">
                Sign in
              </Link>{" "}
              to manage your plan.
            </p>
          )}
        </div>
      </div>
    </FrontendLayout>
  );
}
