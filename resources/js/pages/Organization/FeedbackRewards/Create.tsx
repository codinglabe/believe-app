import React, { useState, useEffect } from 'react'
import { Head, Link, usePage, router } from '@inertiajs/react'
import AppLayout from '@/layouts/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, ArrowRight, Plus, Trash2, Rocket, Check, Users, AlertCircle } from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast'

interface CampaignType { value: string; label: string; default_reward: number; est_time: string }
interface Props {
  wallet: { balance_brp: number; available_brp: number }
  campaignTypes: CampaignType[]
  organization: { id: number; name: string }
}

const STEPS = ['Setup', 'Questions', 'Audience', 'Review & Launch']

export default function OrgCreateCampaign({ wallet, campaignTypes, organization }: Props) {
  const { props } = usePage<{ success?: string; error?: string }>()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    title: '',
    type: 'short_feedback',
    reward_per_response_brp: 10,
    total_budget_brp: 10000,
    question_text: '',
    question_type: 'multiple_choice' as 'yes_no' | 'true_false' | 'multiple_choice',
    options: ['', ''] as string[],
    target_audience: 'all_supporters',
    min_age: 'any',
    location: 'all_locations',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (props.success) showSuccessToast(props.success)
    if (props.error) showErrorToast(props.error)
  }, [props.success, props.error])

  const setField = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }))

  const reward = form.reward_per_response_brp || 0
  const budget = form.total_budget_brp || 0
  const maxResponses = reward > 0 ? Math.floor(budget / reward) : 0
  const selectedType = campaignTypes.find((t) => t.value === form.type)
  const insufficientBalance = wallet.available_brp < budget

  const addOption = () => { if (form.options.length < 6) setField('options', [...form.options, '']) }
  const removeOption = (i: number) => { if (form.options.length > 2) setField('options', form.options.filter((_, idx) => idx !== i)) }
  const updateOption = (i: number, v: string) => { const o = [...form.options]; o[i] = v; setField('options', o) }

  const validateStep = (s: number) => {
    const e: Record<string, string> = {}
    if (s === 0) {
      if (!form.title.trim()) e.title = 'Campaign title is required'
      if (!form.reward_per_response_brp || form.reward_per_response_brp < 1) e.reward = 'Reward must be at least 1 BP'
      if (!form.total_budget_brp || form.total_budget_brp < form.reward_per_response_brp) e.budget = 'Budget must be ≥ reward per response'
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
      total_budget_brp: form.total_budget_brp,
      question_text: form.question_text,
      question_type: form.question_type,
      options: form.options,
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
            <h1 className="text-2xl font-bold">Create Feedback Campaign</h1>
            <p className="text-sm text-muted-foreground">{organization.name}</p>
          </div>
        </div>

        {/* Step Wizard Bar */}
        <div className="flex items-center">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  i < step ? 'bg-emerald-500 border-emerald-500 text-white'
                  : i === step ? 'bg-[#FF1493] border-[#FF1493] text-white'
                  : 'bg-transparent border-muted-foreground/40 text-muted-foreground'}`}>
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={`text-sm font-medium hidden sm:block ${i === step ? 'text-foreground' : i < step ? 'text-emerald-500' : 'text-muted-foreground'}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-3 ${i < step ? 'bg-emerald-500' : 'bg-border'}`} />}
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
                        className={`p-3 rounded-xl border text-left transition-all ${form.type === ct.value ? 'border-[#FF1493] bg-[#FF1493]/10' : 'border-border hover:border-muted-foreground/40'}`}>
                        <p className="text-xs font-semibold">{ct.label}</p>
                        <p className="text-xs text-[#FF1493] font-bold">{ct.default_reward} BP</p>
                        <p className="text-xs text-muted-foreground">{ct.est_time}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Reward Per Response (BP)</Label>
                  <Input type="number" min={1} value={form.reward_per_response_brp} onChange={(e) => setField('reward_per_response_brp', Number(e.target.value))} className={`mt-1 ${errors.reward ? 'border-destructive' : ''}`} />
                  <p className="text-xs text-muted-foreground mt-1">= ${(reward * 0.01).toFixed(2)} value</p>
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
                    <Label>Total Budget</Label>
                    <div className="flex gap-2 mt-1">
                      <Input type="number" min={1} value={form.total_budget_brp} onChange={(e) => setField('total_budget_brp', Number(e.target.value))} className={errors.budget ? 'border-destructive' : ''} />
                      <div className="px-3 py-2 rounded-lg bg-muted/50 border text-sm whitespace-nowrap">BRP</div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">≈ ${(budget * 0.01).toFixed(2)} value</p>
                    {errors.budget && <p className="text-xs text-destructive mt-1">{errors.budget}</p>}
                  </div>
                  <div>
                    <Label>Max Responses (Auto Calculated)</Label>
                    <div className="mt-2 flex items-center justify-center h-20 rounded-xl bg-[#FF1493]/10 border border-[#FF1493]/30">
                      <span className="text-4xl font-extrabold text-[#FF1493]">{maxResponses.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground ml-2 self-end mb-1">Responses</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#FF1493]/20">
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Live Calculation</p>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">✓ Earned per response</span><span className="font-medium">{reward} BP</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">✓ Max participants</span><span className="font-medium">{maxResponses.toLocaleString()}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">✓ Total campaign cost</span><span className="font-medium">{budget.toLocaleString()} BRP</span></div>
                  {insufficientBalance && budget > 0 && (
                    <div className="flex items-center gap-2 pt-2 border-t mt-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <p className="text-xs text-amber-500">Insufficient BRP balance.</p>
                    </div>
                  )}
                  {!insufficientBalance && budget > 0 && (
                    <p className="text-xs text-emerald-500 pt-1">✓ You have enough BRP to launch this campaign</p>
                  )}
                  <p className="text-xs text-muted-foreground/60 pt-1 italic">💡 Your budget will be reserved when campaign starts.</p>
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
                        className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${form.question_type === qt.v ? 'border-[#FF1493] bg-[#FF1493]/10 text-foreground' : 'border-border text-muted-foreground hover:border-muted-foreground/40'}`}>
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
                        className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${form.target_audience === opt.v ? 'border-[#FF1493] bg-[#FF1493]/10' : 'border-border hover:border-muted-foreground/40'}`}>
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${form.target_audience === opt.v ? 'border-[#FF1493]' : 'border-muted-foreground/40'}`}>
                          {form.target_audience === opt.v && <div className="w-2 h-2 rounded-full bg-[#FF1493]" />}
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
                    <Users key={i} className={`h-8 w-8 ${i < 4 ? 'text-[#FF1493]' : 'text-muted-foreground/20'}`} />
                  ))}
                </div>
                <p className="text-5xl font-extrabold mb-1">{maxResponses.toLocaleString()}</p>
                <p className="text-muted-foreground text-sm">Estimated Reach</p>
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
                  ['Reward Per Response', `${reward} BP (= $${(reward * 0.01).toFixed(2)})`],
                  ['Total Budget', `${budget.toLocaleString()} BRP (= $${(budget * 0.01).toFixed(2)})`],
                  ['Max Responses', maxResponses.toLocaleString()],
                  ['Estimated Time', selectedType?.est_time || '—'],
                  ['Question Type', form.question_type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())],
                  ['Audience', form.target_audience.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium text-right max-w-[55%]">{v}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="border-[#FF1493]/30">
                <CardContent className="p-5 space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">BRP Wallet</p>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Available Balance</span><span className="font-bold">{wallet.available_brp.toLocaleString()} BRP</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Required for campaign</span><span className="text-amber-500 font-bold">{budget.toLocaleString()} BRP</span></div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">After Launch Balance</span>
                    <span className={`font-bold ${wallet.available_brp - budget >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                      {(wallet.available_brp - budget).toLocaleString()} BRP
                    </span>
                  </div>
                  {!insufficientBalance ? (
                    <p className="text-xs text-emerald-500 flex items-center gap-1"><Check className="h-3.5 w-3.5" />You have enough BRP to launch this campaign</p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <p className="text-xs text-amber-500">Not enough BRP. Contact admin to top up your wallet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Button
                onClick={submit}
                disabled={submitting || insufficientBalance}
                className="w-full py-4 text-base font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50"
              >
                <Rocket className="h-5 w-5 mr-2" />
                {submitting ? 'Creating Campaign...' : 'Create Campaign →'}
              </Button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-2">
          <Button type="button" variant="outline" onClick={prev} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back
          </Button>
          {step < 3 ? (
            <Button type="button" onClick={next} className="bg-gradient-to-r from-[#FF1493] to-[#DC143C]">
              Next: {STEPS[step + 1]} <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : null}
        </div>
      </div>
    </AppLayout>
  )
}
