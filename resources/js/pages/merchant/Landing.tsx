import React from 'react'
import { Head, Link } from '@inertiajs/react'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantHeader, MerchantFooter } from '@/components/merchant'
import type { MerchantHeaderAnchorNavItem } from '@/components/merchant/MerchantHeader'
import {
  ArrowRight,
  BookOpen,
  Check,
  Code2,
  Eye,
  HeartHandshake,
  LayoutDashboard,
  LifeBuoy,
  LineChart,
  MapPin,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  UserPlus,
  Users,
} from 'lucide-react'

const landingAnchorNav: MerchantHeaderAnchorNavItem[] = [
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'benefits', label: 'Benefits' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'resources', label: 'Resources' },
  { id: 'about-us', label: 'About Us' },
]

const howItWorksCards = [
  {
    step: '1',
    title: 'Join the BIU Merchant Network',
    text: 'Create your merchant account and become part of a growing community that supports nonprofits, churches, and verified volunteers.',
    icon: Store,
  },
  {
    step: '2',
    title: 'Create Your Offers',
    text: 'Set up discounts, rewards, BRP campaigns, or volunteer appreciation offers directly from your dashboard.',
    icon: Tag,
  },
  {
    step: '3',
    title: 'Volunteers & Supporters Redeem',
    text: 'Verified supporters and volunteers discover your business through BIU and redeem your offers online or in-store.',
    icon: Users,
  },
  {
    step: '4',
    title: 'Grow Your Business',
    text: 'Gain new customers, increase repeat visits, strengthen community visibility, and build goodwill through meaningful impact.',
    icon: LineChart,
  },
]

const benefitItems: Array<{
  title: string
  text: string
  icon: React.ComponentType<{ className?: string }>
  bullets?: string[]
}> = [
  {
    title: 'Reward Community Service',
    text: 'Support volunteers, nonprofits, churches, and community programs while growing your customer base.',
    icon: HeartHandshake,
  },
  {
    title: 'Gain New Customers',
    text: 'Reach supporters actively looking to shop with businesses that give back.',
    icon: UserPlus,
  },
  {
    title: 'No Hidden Fees',
    text: 'Transparent pricing with full visibility into your offers, rewards, and performance.',
    icon: Eye,
  },
  {
    title: 'Full Dashboard Control',
    text: 'Manage offers, campaigns, limits, analytics, and customer engagement from one platform.',
    icon: LayoutDashboard,
  },
  {
    title: 'Verified Volunteer Network',
    text: 'Only verified supporters and volunteers can redeem community reward offers.',
    icon: ShieldCheck,
  },
  {
    title: 'Increase Local Visibility',
    text: 'Your business becomes discoverable through BIU nonprofit and supporter networks.',
    icon: MapPin,
  },
  {
    title: 'Flexible Reward Options',
    text: 'Offer:',
    icon: Tag,
    bullets: [
      'Percentage discounts',
      'Fixed discounts',
      'BRP rewards',
      'Volunteer specials',
      'Seasonal campaigns',
    ],
  },
  {
    title: 'Community Impact Branding',
    text: 'Show customers your business actively supports local causes and organizations.',
    icon: Sparkles,
  },
]

const resourceItems = [
  {
    title: 'Merchant Help Center',
    text: 'Guides and tutorials for setting up your merchant account and campaigns.',
    icon: BookOpen,
  },
  {
    title: 'Volunteer Verification Guide',
    text: 'Learn how BIU verifies volunteers and community participants.',
    icon: ShieldCheck,
  },
  {
    title: 'Marketing Toolkit',
    text: 'Download promotional materials, logos, social graphics, and campaign templates.',
    icon: Megaphone,
  },
  {
    title: 'Community Growth Tips',
    text: 'Best practices for attracting supporters and increasing customer engagement.',
    icon: LineChart,
  },
  {
    title: 'API & Integrations',
    text: 'Developer resources for POS systems, ecommerce, and BIU integrations.',
    icon: Code2,
  },
  {
    title: 'Support Center',
    text: 'Access live support, FAQs, and onboarding assistance.',
    icon: LifeBuoy,
  },
]

const growthPlanIncludes = [
  'Advanced Analytics',
  'Priority Support',
]

export default function MerchantLanding() {
  return (
    <>
      <Head title="Reward Service. Grow Together." />

      <div className="min-h-screen bg-[#050B1D] text-white">
        <MerchantHeader
          variant="public"
          tagline="Reward Service. Grow Together."
          anchorNav={landingAnchorNav}
        />

        <main className="pt-24 pb-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <section className="rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-[#0A122D] via-[#0D1735] to-[#111A3D] p-6 shadow-[0_0_80px_rgba(56,65,162,0.28)] sm:p-8 lg:p-10">
              <div className="grid gap-7 lg:grid-cols-2 lg:gap-8">
                <div className="space-y-5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-indigo-300/25 bg-indigo-300/10 px-3 py-1 text-xs font-semibold text-indigo-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-300" />
                    10% Discount For Verified Volunteers
                  </div>

                  <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
                    Reward Service.
                    <span className="mt-1 block bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                      Grow Together.
                    </span>
                  </h1>

                  <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                    BIU Merchant Hub helps nonprofits and churches reward verified volunteers with up to a 10% discount,
                    turning your community service into new customers for your business.
                  </p>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link href="/register">
                      <MerchantButton className="w-full sm:w-auto">
                        Join the 10% Discount Merchant Hub
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </MerchantButton>
                    </Link>
                    <Link href="/hub">
                      <MerchantButton variant="outline" className="w-full border-slate-600/80 bg-transparent sm:w-auto">
                        Browse Offers
                      </MerchantButton>
                    </Link>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2 text-xs text-slate-300 sm:text-sm">
                    <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 px-3 py-2 text-center">Simple Setup</div>
                    <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 px-3 py-2 text-center">No Hidden Fees</div>
                    <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 px-3 py-2 text-center">Full Control</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-indigo-300/20 bg-[#081229] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-100">Welcome back, Merchant</p>
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs text-emerald-300">Live</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-700/60 bg-slate-900/45 p-3">
                      <p className="text-xs text-slate-400">Total Offers</p>
                      <p className="mt-1 text-xl font-bold">24</p>
                    </div>
                    <div className="rounded-xl border border-slate-700/60 bg-slate-900/45 p-3">
                      <p className="text-xs text-slate-400">Total Claims</p>
                      <p className="mt-1 text-xl font-bold">1,248</p>
                    </div>
                    <div className="rounded-xl border border-slate-700/60 bg-slate-900/45 p-3">
                      <p className="text-xs text-slate-400">New Customers</p>
                      <p className="mt-1 text-xl font-bold">312</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-900/45 p-4">
                    <p className="text-xs text-slate-400">Claims Trend</p>
                    <div className="mt-3 h-24 rounded-lg bg-gradient-to-b from-indigo-400/20 to-transparent p-2">
                      <div className="h-full w-full rounded-md border border-dashed border-indigo-300/35" />
                    </div>
                    <p className="mt-3 text-xs text-slate-300">You paid out $2,481 discounts this month</p>
                  </div>
                </div>
              </div>
            </section>

            <section id="how-it-works" className="scroll-mt-28 pt-14">
              <h2 className="text-center text-3xl font-bold sm:text-4xl">How It Works</h2>
              <p className="mx-auto mt-2 max-w-xl text-center text-slate-300">
                Simple steps to start rewarding volunteers and growing your business.
              </p>

              <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {howItWorksCards.map((card) => {
                  const Icon = card.icon
                  return (
                    <div key={card.title} className="rounded-2xl border border-slate-700/70 bg-[#0A132B] p-5">
                      <div className="mb-3 flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 text-sm font-bold text-violet-200">
                          {card.step}
                        </span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-violet-400/40 bg-violet-500/10">
                          <Icon className="h-5 w-5 text-violet-300" />
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold leading-snug">{card.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{card.text}</p>
                    </div>
                  )
                })}
              </div>
            </section>

            <section id="benefits" className="scroll-mt-28 pt-14">
              <h2 className="text-center text-3xl font-bold sm:text-4xl">Benefits</h2>
              <p className="mx-auto mt-2 max-w-2xl text-center text-slate-300">
                Drive growth while supporting the people and organizations making a difference in your community.
              </p>

              <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {benefitItems.map((card) => {
                  const Icon = card.icon
                  return (
                    <div key={card.title} className="rounded-2xl border border-slate-700/70 bg-[#0A132B] p-5">
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-blue-400/40 bg-blue-500/10">
                        <Icon className="h-5 w-5 text-blue-300" />
                      </div>
                      <h3 className="text-lg font-semibold leading-snug">{card.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{card.text}</p>
                      {card.bullets ? (
                        <ul className="mt-3 list-disc space-y-1.5 pl-4 text-sm text-slate-300">
                          {card.bullets.map((b) => (
                            <li key={b}>{b}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </section>

            <section id="pricing" className="scroll-mt-28 pt-14">
              <h2 className="text-center text-3xl font-bold sm:text-4xl">Pricing</h2>
              <p className="mx-auto mt-2 max-w-xl text-center text-slate-300">Transparent plans built for merchants on BIU.</p>

              <div className="mx-auto mt-8 max-w-md">
                <div className="rounded-3xl border border-violet-400/35 bg-gradient-to-b from-[#121a3d] to-[#0A132B] p-8 shadow-[0_0_60px_rgba(139,92,246,0.15)]">
                  <p className="text-center text-sm font-semibold uppercase tracking-wider text-violet-300">Pro</p>
                  <p className="mt-2 text-center text-4xl font-extrabold sm:text-5xl">
                    $9<span className="text-lg font-semibold text-slate-400">/month</span>
                  </p>
                  <p className="mt-3 text-center text-sm text-slate-300">Advanced Analytics and Priority Support for growing merchants.</p>
                  <p className="mt-6 text-sm font-semibold text-white">Pro includes:</p>
                  <ul className="mt-3 space-y-2.5">
                    {growthPlanIncludes.map((line) => (
                      <li key={line} className="flex gap-2 text-sm text-slate-200">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                        {line}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    <Link href="/register" className="block">
                      <MerchantButton className="w-full">
                        Get Started
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </MerchantButton>
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <section id="resources" className="scroll-mt-28 pt-14">
              <h2 className="text-center text-3xl font-bold sm:text-4xl">Resources</h2>
              <p className="mx-auto mt-2 max-w-2xl text-center text-slate-300">
                Everything you need to launch, promote, and scale on the BIU Merchant network.
              </p>

              <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {resourceItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-slate-700/70 bg-[#0A132B] p-5 transition-colors hover:border-indigo-400/30"
                    >
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-indigo-400/35 bg-indigo-500/10">
                        <Icon className="h-5 w-5 text-indigo-300" />
                      </div>
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{item.text}</p>
                    </div>
                  )
                })}
              </div>
            </section>

            <section id="about-us" className="scroll-mt-28 pt-14">
              <h2 className="text-center text-3xl font-bold sm:text-4xl">About Us</h2>

              <div className="mx-auto mt-8 max-w-3xl space-y-8 rounded-3xl border border-slate-700/70 bg-[#0A132B] p-6 sm:p-10">
                <div>
                  <h3 className="text-xl font-bold text-white sm:text-2xl">Built to Strengthen Communities</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
                    BIU Merchant was created to help businesses grow by supporting the people and organizations making a difference every day.
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
                    We believe commerce can do more than generate sales — it can strengthen neighborhoods, reward service, and create lasting
                    community impact.
                  </p>
                  <p className="mt-4 text-sm font-medium text-slate-200 sm:text-base">Our platform connects:</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300 sm:text-base">
                    <li>Businesses</li>
                    <li>Nonprofits</li>
                    <li>Churches</li>
                    <li>Volunteers</li>
                    <li>Supporters</li>
                  </ul>
                  <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
                    through a shared ecosystem focused on growth, giving, and opportunity.
                  </p>
                  <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
                    By helping merchants reward verified volunteers and supporters, we create a cycle where:
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300 sm:text-base">
                    <li>Businesses gain customers</li>
                    <li>Organizations gain support</li>
                    <li>Communities grow stronger together</li>
                  </ul>
                </div>

                <div className="border-t border-slate-700/80 pt-8">
                  <h4 className="text-lg font-bold text-violet-200">Our Mission</h4>
                  <p className="mt-2 text-sm leading-7 text-slate-300 sm:text-base">
                    To build a community-powered commerce network that rewards service, supports nonprofits, and helps local businesses thrive.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-bold text-blue-200">Our Vision</h4>
                  <p className="mt-2 text-sm leading-7 text-slate-300 sm:text-base">
                    A future where every purchase can create meaningful community impact.
                  </p>
                </div>
              </div>
            </section>

            <section className="pt-14">
              <div className="rounded-3xl border border-indigo-400/30 bg-gradient-to-r from-[#0F1D46] via-[#182B65] to-[#0E1F4B] px-6 py-8 sm:px-8 sm:py-10">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Ready to make an impact?</p>
                    <h3 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
                      Let&apos;s grow your business
                      <span className="block">and our community.</span>
                    </h3>
                    <p className="mt-3 text-slate-200">
                      Join the BIU Merchant Hub and start rewarding volunteers today.
                    </p>
                  </div>
                  <div className="flex min-w-[260px] flex-col gap-3">
                    <Link href="/register">
                      <MerchantButton className="w-full">
                        Join the 10% Discount Merchant Hub
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </MerchantButton>
                    </Link>
                    <Link href="/hub">
                      <MerchantButton variant="outline" className="w-full border-slate-300/30 text-white">
                        Browse Offers
                      </MerchantButton>
                    </Link>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-2 text-sm text-violet-200">
                  <Megaphone className="h-4 w-4" />
                  Built for community-minded merchants.
                </div>
              </div>
            </section>
          </div>
        </main>

        <MerchantFooter />
      </div>
    </>
  )
}
