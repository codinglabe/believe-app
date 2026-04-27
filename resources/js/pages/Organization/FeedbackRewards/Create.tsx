import React, { useState, useEffect } from 'react'
import { Head, Link, usePage, router } from '@inertiajs/react'
import AppLayout from '@/layouts/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, ArrowRight, Plus, Trash2, Rocket, Check, Users, AlertCircle, Loader2 } from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast'
import { stripInertiaFeePreviewFromUrl } from '@/lib/stripInertiaFeePreviewFromUrl'
import { Skeleton } from '@/components/ui/skeleton'
import { ofb } from './theme'

interface CampaignType {
  value: string
  label: string
  default_reward: number
  est_time: string
  per_response_bp_display: number
}

interface LiveCalculation {
  per_response_bp_display: number
  max_responses: number
  reward_matches_type_default: boolean
  custom_max_responses: number
  budget_usd: number
  platform_fee_usd: number
  processing_fee_usd: number
  total_usd: number
  sufficient_brp: boolean
}

interface Props {
  wallet: { balance_brp: number; available_brp: number }
  campaignTypes: CampaignType[]
  organization: { id: number; name: string }
  liveCalculation?: LiveCalculation | null
}

const STEPS = ['Setup', 'Questions', 'Audience', 'Review & Launch']

function formatDisplayBp(n: number): string {
  return `${n.toFixed(2)} BP`
}

function LiveFeePreviewSkeleton() {
  return (
    <div
      className="space-y-2.5"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading fee estimate"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 flex-1 max-w-[60%]" />
          <Skeleton className="h-4 w-20 shrink-0" />
        </div>
      ))}
      <Skeleton className="mt-1 h-3 max-w-xs" />
    </div>
  )
}

export default function OrgCreateCampaign({ wallet, campaignTypes, organization, liveCalculation = null }: Props) {
  const { props } = usePage<{ success?: string; error?: string }>()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [feePreviewLoading, setFeePreviewLoading] = useState(false)

  const [form, setForm] = useState({
    title: '',
    type: 'short_feedback',
    reward_per_response_brp: 10,
    // Whole BP; API stores US cents (×100) on submit — same as merchant hub
    total_budget_brp: '50',
    question_text: '',
    question_type: 'multiple_choice' as 'yes_no' | 'true_false' | 'multiple_choice',
    options: ['', ''] as string[],
    target_audience: 'all_supporters',
    min_age: 'any',
    location: 'all_locations',
    starts_at: '',
    ends_at: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (props.success) showSuccessToast(props.success)
    if (props.error) showErrorToast(props.error)
  }, [props.success, props.error])

  const setField = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }))

  const parsedBudget = Number.parseInt(String(form.total_budget_brp || ''), 10)
  const budget = Number.isFinite(parsedBudget) ? parsedBudget : 0

  const reward = form.reward_per_response_brp || 0
  const selectedType = campaignTypes.find((t) => t.value === form.type)
  const live = liveCalculation && budget > 0 ? liveCalculation : null
  const maxResponses = live
    ? live.custom_max_responses
    : (reward > 0 ? Math.floor((budget * 100) / reward) : 0)
  const modelSupportersForSelectedType = live ? live.max_responses : 0
  const rewardMatchesTypeDefault = live
    ? live.reward_matches_type_default
    : Boolean(selectedType && reward === selectedType.default_reward)
  const insufficientBalance = live ? !live.sufficient_brp : wallet.available_brp < budget
  const budgetHintUsd = live ? live.budget_usd : budget

  useEffect(() => {
    if (budget <= 0) return
    const t = window.setTimeout(() => {
      router.get(
        '/organization/feedback-rewards/create',
        {
          fee_preview_budget_bp: budget,
          fee_preview_type: form.type,
          fee_preview_reward_brp: form.reward_per_response_brp,
        },
        {
          preserveState: true,
          preserveScroll: true,
          replace: true,
          only: ['liveCalculation'],
          onStart: () => setFeePreviewLoading(true),
          onFinish: () => {
            setFeePreviewLoading(false)
            stripInertiaFeePreviewFromUrl()
          },
        },
      )
    }, 350)

    return () => window.clearTimeout(t)
  }, [budget, form.type, form.reward_per_response_brp])

  const addOption = () => { if (form.options.length < 6) setField('options', [...form.options, '']) }
  const removeOption = (i: number) => { if (form.options.length > 2) setField('options', form.options.filter((_, idx) => idx !== i)) }
  const updateOption = (i: number, v: string) => { const o = [...form.options]; o[i] = v; setField('options', o) }

  const validateStep = (s: number) => {
    const e: Record<string, string> = {}
    if (s === 0) {
      if (!form.title.trim()) e.title = 'Campaign title is required'
      if (!form.reward_per_response_brp || form.reward_per_response_brp < 1) e.reward = 'Reward must be at least 1 BP'
      if (!budget || budget * 100 < reward) e.budget = 'Budget in BP (1 BP = $1) must cover the per-response cost'
    }
    if (s === 1) {
      if (!form.question_text.trim()) e.question_text = 'Question is required'
      if (form.question_type === 'multiple_choice' && form.options.filter(o => o.trim()).length < 2) e.options = 'At least 2 options required'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => { if (validateStep(step)) setStep((s) => Math.min(s + 1, 3)) }
  const prev = () => setStep((s) => Math.max(s - 1, 0))

  const submit = () => {
    if (!validateStep(2)) return
    setSubmitting(true)
    router.post('/organization/feedback-rewards', {
      title: form.title,
      type: form.type,
      reward_per_response_brp: form.reward_per_response_brp,
      total_budget_brp: budget * 100,
      question_text: form.question_text,
      question_type: form.question_type,
      options: form.options,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
    }, {
      onSuccess: () => router.visit('/organization/feedback-rewards'),
      onError: (errs) => { setErrors(errs); setSubmitting(false) },
      onFinish: () => setSubmitting(false),
    })
  }

  return (
    <AppLayout>
      <Head title="Create Feedback Campaign" />
      <div className="container mx-auto py-8 px-4 max-w-5xl space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/organization/feedback-rewards">
            <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
          </Link>
          <div>
            <h1 className={`text-2xl font-bold ${ofb.titleGradient}`}>Create Feedback Campaign</h1>
            <p className="text-sm text-muted-foreground">{organization.name} · 1 BP = $1.00</p>
          </div>
        </div>

        {/* Step Wizard Bar */}
        <div className="flex items-center">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i < step ? ofb.stepDone : i === step ? `${ofb.stepActive} ${ofb.stepActiveRing}` : ofb.stepTodo
                  }`}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : i + 1}
                </div>
                <span
                  className={`text-sm font-medium hidden sm:block ${
                    i === step ? 'text-foreground' : i < step ? ofb.stepLabelDone : 'text-muted-foreground'
                  }`}
                >
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-3 ${i < step ? ofb.stepLine : 'bg-border'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* ── STEP 1: SETUP ── */}
        {step === 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Reward Setup</CardTitle>
                <p className="text-sm text-muted-foreground">Configure your campaign reward</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Campaign Title *</Label>
                  <Input value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="e.g., Community Impact Survey" className={`mt-1 ${errors.title ? 'border-destructive' : ''}`} />
                  {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
                </div>
                <div>
                  <Label>Campaign Type</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {campaignTypes.map((ct) => (
                      <button key={ct.value} type="button" onClick={() => { setField('type', ct.value); setField('reward_per_response_brp', ct.default_reward) }}
                        className={`p-3 rounded-xl border text-left transition-all ${form.type === ct.value ? ofb.selected : 'border-border hover:border-muted-foreground/40'}`}>
                        <p className="text-xs font-semibold">{ct.label}</p>
                        <p className={`text-xs font-bold ${ofb.text}`}>{ct.per_response_bp_display.toFixed(2)} BP</p>
                        <p className="text-xs text-muted-foreground">{ct.est_time}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Reward Per Response (BP)</Label>
                  <Input type="number" min={1} value={form.reward_per_response_brp} onChange={(e) => setField('reward_per_response_brp', Number(e.target.value))} className={`mt-1 ${errors.reward ? 'border-destructive' : ''}`} />
                  <p className="text-xs text-muted-foreground mt-1">= ${(reward / 100).toFixed(2)} per response (stored units)</p>
                  {errors.reward && <p className="text-xs text-destructive mt-1">{errors.reward}</p>}
                </div>
                <div>
                  <Label>Estimated Time</Label>
                  <div className="mt-1 px-3 py-2 rounded-lg bg-muted/50 border text-sm">{selectedType?.est_time || '~1 min'}</div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Budget & Responses</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Total budget (BP)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        min={1}
                        value={form.total_budget_brp}
                        onChange={(e) => setField('total_budget_brp', e.target.value)}
                        className={errors.budget ? 'border-destructive' : ''}
                      />
                      <div className="px-3 py-2 rounded-lg bg-muted/50 border text-sm whitespace-nowrap">BP</div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">1 BP = $1.00 (≈ ${budgetHintUsd.toFixed(2)} in dollars)</p>
                    {errors.budget && <p className="text-xs text-destructive mt-1">{errors.budget}</p>}
                  </div>
                  <div>
                    <Label>Max Responses (by campaign type &amp; budget)</Label>
                    <div className={`mt-2 flex min-h-20 flex-col items-center justify-center gap-0.5 rounded-xl py-3 ${ofb.surface}`}>
                      <span className={`text-4xl font-extrabold leading-none tabular-nums ${ofb.kpi}`}>
                        {modelSupportersForSelectedType.toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground">Responses</span>
                    </div>
                    {!rewardMatchesTypeDefault && (
                      <p className="text-xs text-amber-500/90 mt-2 text-center">
                        Reward field differs from this type’s default — capacity if using your value: {maxResponses.toLocaleString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className={ofb.border}>
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                    Live calculation
                    {feePreviewLoading && budget > 0 && (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                    )}
                  </p>
                  {feePreviewLoading && budget > 0 ? (
                    <LiveFeePreviewSkeleton />
                  ) : live ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">✓ Per-response</span>
                        <span className="font-medium text-right">{formatDisplayBp(live.per_response_bp_display)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">✓ Max responses</span>
                        <span className="font-medium text-right">{modelSupportersForSelectedType.toLocaleString()}</span>
                      </div>
                      {!rewardMatchesTypeDefault && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">✓ Custom reward field</span>
                          <span className="font-medium text-right">{maxResponses.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">✓ Campaign budget (rewards)</span>
                        <span className="font-medium">${live.budget_usd.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">✓ Platform fee (4.5%)</span>
                        <span className="font-medium">${live.platform_fee_usd.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">✓ Stripe fee (3.5%)</span>
                        <span className="font-medium">${live.processing_fee_usd.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground font-semibold">✓ Total charge</span>
                        <span className={`font-semibold ${ofb.textStrong}`}>${live.total_usd.toFixed(2)}</span>
                      </div>
                      {insufficientBalance && (
                        <div className="flex items-center gap-2 pt-2 border-t mt-2">
                          <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                          <p className="text-xs text-amber-500">
                            Not enough BP in the organization wallet for this budget.{' '}
                            <Link href="/organization/wallet/brp/buy" className="underline">Buy BP →</Link>
                          </p>
                        </div>
                      )}
                      {!insufficientBalance && (
                        <p className="text-xs text-teal-600 dark:text-teal-400 pt-1">✓ You have enough BP to reserve this campaign budget</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground py-1">
                      {budget > 0 ? '—' : 'Set a total budget to calculate fees and limits.'}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/60 pt-1 italic">💡 Your budget will be reserved when the campaign starts.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── STEP 2: QUESTIONS ── */}
        {step === 1 && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Questions</CardTitle>
                <p className="text-sm text-muted-foreground">Choose type and add your question</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Question Type</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {[{ v: 'yes_no', l: 'Yes / No' }, { v: 'true_false', l: 'True / False' }, { v: 'multiple_choice', l: 'Multiple Choice' }].map((qt) => (
                      <button key={qt.v} type="button" onClick={() => setField('question_type', qt.v)}
                        className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${form.question_type === qt.v ? `${ofb.selected} text-foreground` : 'border-border text-muted-foreground hover:border-muted-foreground/40'}`}>
                        {qt.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Question *</Label>
                  <Textarea value={form.question_text} onChange={(e) => setField('question_text', e.target.value)} placeholder="What do you think about our new program?" rows={3} className={`mt-1 ${errors.question_text ? 'border-destructive' : ''}`} />
                  {errors.question_text && <p className="text-xs text-destructive mt-1">{errors.question_text}</p>}
                </div>
                {form.question_type === 'multiple_choice' && (
                  <div className="space-y-2">
                    <Label>Answer Options (min 2, max 6)</Label>
                    {form.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-6">Option {String.fromCharCode(65 + i)}</span>
                        <Input value={opt} onChange={(e) => updateOption(i, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + i)}`} className="flex-1 text-sm" />
                        {form.options.length > 2 && (
                          <button type="button" onClick={() => removeOption(i)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button>
                        )}
                      </div>
                    ))}
                    {form.options.length < 6 && (
                      <Button type="button" variant="outline" size="sm" onClick={addOption}><Plus className="h-3.5 w-3.5 mr-1" />Add Option</Button>
                    )}
                    {errors.options && <p className="text-xs text-destructive mt-1">{errors.options}</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Question Preview</CardTitle>
                <p className="text-sm text-muted-foreground">What supporters will see</p>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-xl bg-muted/30 border space-y-3">
                  {form.question_text
                    ? <p className="text-sm font-medium">{form.question_text}</p>
                    : <p className="text-sm text-muted-foreground italic">Your question will appear here…</p>}
                  {form.question_type === 'yes_no' && (
                    <div className="grid grid-cols-2 gap-2">
                      {['Yes', 'No'].map((o) => <div key={o} className="py-2 text-center border rounded-lg text-sm text-muted-foreground">{o}</div>)}
                    </div>
                  )}
                  {form.question_type === 'true_false' && (
                    <div className="grid grid-cols-2 gap-2">
                      {['True', 'False'].map((o) => <div key={o} className="py-2 text-center border rounded-lg text-sm text-muted-foreground">{o}</div>)}
                    </div>
                  )}
                  {form.question_type === 'multiple_choice' && (
                    <div className="space-y-2">
                      {form.options.map((o, i) => o.trim() && (
                        <div key={i} className="flex items-center gap-2 py-2 px-3 border rounded-lg text-sm text-muted-foreground">
                          <div className="w-4 h-4 rounded-full border border-muted-foreground/40" />
                          {o}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── STEP 3: AUDIENCE ── */}
        {step === 2 && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Audience</CardTitle>
                <p className="text-sm text-muted-foreground">Choose who will see your feedback campaign</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Target Audience</Label>
                  <div className="space-y-2 mt-2">
                    {[
                      { v: 'all_supporters', l: 'All Supporters', d: 'Show to everyone on the platform' },
                      { v: 'followers', l: 'Followers', d: 'Show to people following your organization' },
                      { v: 'past_donors', l: 'Past Donors', d: 'Show to supporters who have donated to you' },
                      { v: 'by_cause', l: 'By Cause', d: 'Show to supporters interested in your cause' },
                    ].map((opt) => (
                      <button key={opt.v} type="button" onClick={() => setField('target_audience', opt.v)}
                        className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${form.target_audience === opt.v ? ofb.selected : 'border-border hover:border-muted-foreground/40'}`}>
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${form.target_audience === opt.v ? 'border-purple-500' : 'border-muted-foreground/40'}`}>
                          {form.target_audience === opt.v && <div className="w-2 h-2 rounded-full bg-purple-500" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{opt.l}</p>
                          <p className="text-xs text-muted-foreground">{opt.d}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Minimum Age</Label>
                    <Select value={form.min_age} onValueChange={(v) => setField('min_age', v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Any" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="18">18+</SelectItem>
                        <SelectItem value="21">21+</SelectItem>
                        <SelectItem value="25">25+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Select value={form.location} onValueChange={(v) => setField('location', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_locations">All Locations</SelectItem>
                        <SelectItem value="us">United States</SelectItem>
                        <SelectItem value="global">Global</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Audience Estimate</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Users key={i} className={`h-8 w-8 ${i < 4 ? ofb.kpi : 'text-muted-foreground/20'}`} />
                  ))}
                </div>
                <p className="text-5xl font-extrabold mb-1">{modelSupportersForSelectedType.toLocaleString()}</p>
                <p className="text-muted-foreground text-sm">Estimated Reach</p>
                {!rewardMatchesTypeDefault && (
                  <p className="text-xs text-amber-500/90 mt-2 text-center">With your custom reward: {maxResponses.toLocaleString()}</p>
                )}
                <p className="text-xs text-muted-foreground/60 mt-3 text-center">Based on your budget and reward, this many supporters could respond to your campaign.</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── STEP 4: REVIEW & LAUNCH ── */}
        {step === 3 && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Campaign Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  ['Campaign Title', form.title],
                  ['Type', campaignTypes.find(t => t.value === form.type)?.label || form.type],
                  [
                    'Per-response (type)',
                    `${selectedType ? formatDisplayBp(selectedType.per_response_bp_display) : '—'}` + (!rewardMatchesTypeDefault ? ` — custom field ${reward} (units)` : ''),
                  ],
                  ['Campaign budget (rewards)', `$${(live?.budget_usd ?? budget).toFixed(2)} (= ${budget.toLocaleString()} BP)`],
                  [
                    'Max responses',
                    rewardMatchesTypeDefault
                      ? modelSupportersForSelectedType.toLocaleString()
                      : `${modelSupportersForSelectedType.toLocaleString()} (type) / ${maxResponses.toLocaleString()} (your reward)`,
                  ],
                  ['Platform fee (4.5%)', `$${(live?.platform_fee_usd ?? 0).toFixed(2)}`],
                  ['Processing fee (3.5%)', `$${(live?.processing_fee_usd ?? 0).toFixed(2)}`],
                  ['Total charge', `$${(live?.total_usd ?? 0).toFixed(2)}`],
                  ['Estimated Time', selectedType?.est_time || '—'],
                  ['Question Type', form.question_type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())],
                  ['Audience', form.target_audience.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())],
                  [
                    'Estimated reach',
                    modelSupportersForSelectedType.toLocaleString() + ' supporters'
                    + (!rewardMatchesTypeDefault ? ` (${maxResponses.toLocaleString()} w/ custom reward)` : ''),
                  ],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium text-right max-w-[55%]">{v}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className={ofb.borderStrong}>
                <CardContent className="p-5 space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Campaign Dates (optional)</p>
                  <div>
                    <Label>Start Date</Label>
                    <input
                      type="date"
                      value={form.starts_at}
                      onChange={(e) => setField('starts_at', e.target.value)}
                      className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 ${ofb.focus}`}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <input
                      type="date"
                      value={form.ends_at}
                      onChange={(e) => setField('ends_at', e.target.value)}
                      className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 ${ofb.focus}`}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className={ofb.borderStrong}>
                <CardContent className="p-5 space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">BP wallet</p>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Available balance</span><span className="font-bold">{wallet.available_brp.toLocaleString()} BP</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Required for campaign</span><span className="text-amber-500 font-bold">{budget.toLocaleString()} BP</span></div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">After launch (est.)</span>
                    <span className={`font-bold ${wallet.available_brp - budget >= 0 ? 'text-teal-600' : 'text-destructive'}`}>
                      {(wallet.available_brp - budget).toLocaleString()} BP
                    </span>
                  </div>
                  {!insufficientBalance ? (
                    <p className="text-xs text-teal-600 flex items-center gap-1 dark:text-teal-400"><Check className="h-3.5 w-3.5" />You have enough BP to launch this campaign</p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <p className="text-xs text-amber-500">
                        Not enough BP. <Link href="/organization/wallet/brp/buy" className="underline">Buy BP →</Link>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Button
                onClick={submit}
                disabled={submitting || insufficientBalance}
                className={`w-full py-4 text-base font-bold disabled:opacity-50 ${ofb.btn}`}
              >
                <Rocket className="h-5 w-5 mr-2" />
                {submitting ? 'Creating Campaign...' : 'Create Campaign →'}
              </Button>
              {insufficientBalance && (
                <Link href="/organization/wallet/brp/buy">
                  <Button variant="outline" className={`w-full ${ofb.btnOutline}`}>Buy BP first</Button>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-2">
          <Button type="button" variant="outline" onClick={prev} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back
          </Button>
          {step < 3 ? (
            <Button type="button" onClick={next} className={ofb.btn}>
              Next: {STEPS[step + 1]} <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : null}
        </div>
      </div>
    </AppLayout>
  )
}
