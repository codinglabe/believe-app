import React, { useState, useEffect } from 'react'
import { Head, Link, usePage, router } from '@inertiajs/react'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantInput } from '@/components/merchant-ui'
import { MerchantLabel } from '@/components/merchant-ui'
import { MerchantTextarea } from '@/components/merchant-ui'
import { MerchantDashboardLayout } from '@/components/merchant'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, ArrowRight, Plus, Trash2, Rocket, Check, Users, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { showSuccessToast, showErrorToast } from '@/lib/toast'

interface CampaignType { value: string; label: string; default_reward: number; est_time: string }
interface Props {
  wallet: { balance_brp: number; available_brp: number }
  campaignTypes: CampaignType[]
}

const STEPS = ['Setup', 'Questions', 'Audience', 'Review & Launch']

export default function CreateCampaign({ wallet, campaignTypes }: Props) {
  const { props } = usePage<{ success?: string; error?: string }>()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [form, setForm] = useState({
    title: '',
    type: 'short_feedback',
    reward_per_response_brp: 10,
    total_budget_brp: 10000,
    question_text: '',
    question_type: 'multiple_choice' as 'yes_no' | 'true_false' | 'multiple_choice',
    options: ['', ''] as string[],
    // Audience
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

  // Live calculations
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
      if (!form.reward_per_response_brp || form.reward_per_response_brp < 1) e.reward = 'Reward must be at least 1 BRP'
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
    router.post('/feedback-rewards', {
      title: form.title,
      type: form.type,
      reward_per_response_brp: form.reward_per_response_brp,
      total_budget_brp: form.total_budget_brp,
      question_text: form.question_text,
      question_type: form.question_type,
      options: form.options,
    }, {
      onSuccess: () => router.visit('/feedback-rewards'),
      onError: (errs) => { setErrors(errs); setSubmitting(false) },
      onFinish: () => setSubmitting(false),
    })
  }

  return (
    <>
      <Head title="Create Feedback Campaign" />
      <MerchantDashboardLayout>
        <div className="w-full max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* Header */}
            <div className="flex items-center gap-4">
              <Link href="/feedback-rewards">
                <MerchantButton variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</MerchantButton>
              </Link>
              <h1 className="text-2xl font-bold text-white">Create Feedback Campaign</h1>
            </div>

            {/* Step Wizard Bar — matches client screens */}
            <div className="flex items-center gap-0">
              {STEPS.map((s, i) => (
                <React.Fragment key={s}>
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                      i < step ? 'bg-emerald-500 border-emerald-500 text-white'
                      : i === step ? 'bg-[#2563EB] border-[#2563EB] text-white'
                      : 'bg-transparent border-gray-600 text-gray-500'}`}>
                      {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <span className={`text-sm font-medium ${i === step ? 'text-white' : i < step ? 'text-emerald-400' : 'text-gray-500'}`}>{s}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-3 ${i < step ? 'bg-emerald-500' : 'bg-gray-700'}`} />}
                </React.Fragment>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {/* ── STEP 1: SETUP ── */}
              {step === 0 && (
                <motion.div key="step0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="grid md:grid-cols-2 gap-6">
                  {/* Left: Reward Setup */}
                  <MerchantCard className="shadow-xl">
                    <MerchantCardHeader>
                      <MerchantCardTitle className="text-white">Reward Setup</MerchantCardTitle>
                      <p className="text-sm text-gray-400">Configure your campaign reward</p>
                    </MerchantCardHeader>
                    <MerchantCardContent className="space-y-4">
                      <div>
                        <MerchantLabel>Campaign Title *</MerchantLabel>
                        <MerchantInput value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="e.g., New T-Shirt Design" className={`mt-1 ${errors.title ? 'border-red-500' : ''}`} />
                        {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
                      </div>
                      <div>
                        <MerchantLabel>Campaign Type</MerchantLabel>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {campaignTypes.map((ct) => (
                            <button key={ct.value} type="button" onClick={() => { setField('type', ct.value); setField('reward_per_response_brp', ct.default_reward) }}
                              className={`p-3 rounded-xl border text-left transition-all ${form.type === ct.value ? 'border-[#2563EB] bg-[#2563EB]/10' : 'border-gray-700/60 bg-gray-900/40 hover:border-gray-600'}`}>
                              <p className="text-xs font-semibold text-white">{ct.label}</p>
                              <p className="text-xs text-[#2563EB] font-bold">{ct.default_reward} BRP</p>
                              <p className="text-xs text-gray-500">{ct.est_time}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <MerchantLabel>Reward Per Response (BRP)</MerchantLabel>
                        <MerchantInput type="number" min={1} value={form.reward_per_response_brp} onChange={(e) => setField('reward_per_response_brp', Number(e.target.value))} className={`mt-1 ${errors.reward ? 'border-red-500' : ''}`} />
                        <p className="text-xs text-gray-500 mt-1">= ${(reward * 0.01).toFixed(2)} value</p>
                        {errors.reward && <p className="text-xs text-red-400 mt-1">{errors.reward}</p>}
                      </div>
                      <div>
                        <MerchantLabel>Estimated Time</MerchantLabel>
                        <div className="mt-1 px-3 py-2 rounded-lg bg-gray-900/50 border border-gray-700/50 text-gray-300 text-sm">{selectedType?.est_time || '~1 min'}</div>
                      </div>
                    </MerchantCardContent>
                  </MerchantCard>

                  {/* Right: Budget & Responses */}
                  <div className="space-y-4">
                    <MerchantCard className="shadow-xl">
                      <MerchantCardHeader>
                        <MerchantCardTitle className="text-white">Budget & Responses</MerchantCardTitle>
                      </MerchantCardHeader>
                      <MerchantCardContent className="space-y-4">
                        <div>
                          <MerchantLabel>Total Budget</MerchantLabel>
                          <div className="flex gap-2 mt-1">
                            <MerchantInput type="number" min={1} value={form.total_budget_brp} onChange={(e) => setField('total_budget_brp', Number(e.target.value))} className={errors.budget ? 'border-red-500' : ''} />
                            <div className="px-3 py-2 rounded-lg bg-gray-900/50 border border-gray-700/50 text-gray-400 text-sm whitespace-nowrap">BRP</div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">≈ ${(budget * 0.01).toFixed(2)} value</p>
                          {errors.budget && <p className="text-xs text-red-400 mt-1">{errors.budget}</p>}
                        </div>
                        <div>
                          <MerchantLabel>Max Responses (Auto Calculated)</MerchantLabel>
                          <div className="mt-2 flex items-center justify-center h-20 rounded-xl bg-[#2563EB]/10 border border-[#2563EB]/30">
                            <span className="text-4xl font-extrabold text-[#2563EB]">{maxResponses.toLocaleString()}</span>
                            <span className="text-sm text-gray-400 ml-2 self-end mb-1">Responses</span>
                          </div>
                        </div>
                      </MerchantCardContent>
                    </MerchantCard>

                    {/* Live Calculation */}
                    <MerchantCard className="shadow-lg border border-[#2563EB]/20">
                      <MerchantCardContent className="p-4 space-y-2">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Live Calculation</p>
                        <div className="flex justify-between text-sm"><span className="text-gray-400">✓ You will pay</span><span className="text-white font-medium">{reward} BRP per response</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-400">✓ Max participants</span><span className="text-white font-medium">{maxResponses.toLocaleString()}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-400">✓ Total campaign cost</span><span className="text-white font-medium">{budget.toLocaleString()} BRP</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-400">✓ Estimated reach</span><span className="text-emerald-400 font-medium">High engagement</span></div>
                        {insufficientBalance && budget > 0 && (
                          <div className="flex items-center gap-2 pt-2 border-t border-gray-800 mt-2">
                            <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                            <p className="text-xs text-amber-400">Insufficient BRP. <Link href="/wallet/brp/buy" className="underline">Buy more →</Link></p>
                          </div>
                        )}
                        {!insufficientBalance && budget > 0 && (
                          <p className="text-xs text-emerald-400 pt-1">✓ You have enough BRP to launch this campaign</p>
                        )}
                        <p className="text-xs text-gray-600 pt-1 italic">💡 Your budget will be reserved when campaign starts.</p>
                      </MerchantCardContent>
                    </MerchantCard>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 2: QUESTIONS ── */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="grid md:grid-cols-2 gap-6">
                  {/* Left: Question builder */}
                  <MerchantCard className="shadow-xl">
                    <MerchantCardHeader>
                      <MerchantCardTitle className="text-white">Questions</MerchantCardTitle>
                      <p className="text-sm text-gray-400">Choose type and add your question</p>
                    </MerchantCardHeader>
                    <MerchantCardContent className="space-y-4">
                      <div>
                        <MerchantLabel>Question Type</MerchantLabel>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {[{ v: 'yes_no', l: 'Yes / No' }, { v: 'true_false', l: 'True / False' }, { v: 'multiple_choice', l: 'Multiple Choice' }].map((qt) => (
                            <button key={qt.v} type="button" onClick={() => setField('question_type', qt.v)}
                              className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${form.question_type === qt.v ? 'border-[#2563EB] bg-[#2563EB]/10 text-white' : 'border-gray-700/50 text-gray-400 hover:border-gray-600'}`}>
                              {qt.l}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <MerchantLabel>Question *</MerchantLabel>
                        <MerchantTextarea value={form.question_text} onChange={(e) => setField('question_text', e.target.value)} placeholder="Which of these designs do you like the most for our new t-shirt?" rows={3} className={`mt-1 ${errors.question_text ? 'border-red-500' : ''}`} />
                        {errors.question_text && <p className="text-xs text-red-400 mt-1">{errors.question_text}</p>}
                      </div>
                      {form.question_type === 'multiple_choice' && (
                        <div className="space-y-2">
                          <MerchantLabel>Answer Options (min 2, max 6)</MerchantLabel>
                          {form.options.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 w-5">Option {String.fromCharCode(65 + i)}</span>
                              <MerchantInput value={opt} onChange={(e) => updateOption(i, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + i)}`} className="flex-1 text-sm" />
                              {form.options.length > 2 && (
                                <button type="button" onClick={() => removeOption(i)} className="text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
                              )}
                            </div>
                          ))}
                          {form.options.length < 6 && (
                            <MerchantButton type="button" variant="outline" size="sm" onClick={addOption}><Plus className="h-3.5 w-3.5 mr-1" />Add Another Option</MerchantButton>
                          )}
                          {errors.options && <p className="text-xs text-red-400 mt-1">{errors.options}</p>}
                        </div>
                      )}
                    </MerchantCardContent>
                  </MerchantCard>

                  {/* Right: Preview */}
                  <MerchantCard className="shadow-xl">
                    <MerchantCardHeader>
                      <MerchantCardTitle className="text-white">Question Preview</MerchantCardTitle>
                      <p className="text-sm text-gray-400">What supporters will see</p>
                    </MerchantCardHeader>
                    <MerchantCardContent>
                      <div className="p-4 rounded-xl bg-gray-950/50 border border-gray-700/50 space-y-3">
                        {form.question_text ? (
                          <p className="text-sm text-white font-medium">{form.question_text}</p>
                        ) : (
                          <p className="text-sm text-gray-600 italic">Your question will appear here…</p>
                        )}
                        {form.question_type === 'yes_no' && (
                          <div className="grid grid-cols-2 gap-2">
                            {['Yes', 'No'].map((o) => <div key={o} className="py-2 text-center border border-gray-700 rounded-lg text-sm text-gray-300">{o}</div>)}
                          </div>
                        )}
                        {form.question_type === 'true_false' && (
                          <div className="grid grid-cols-2 gap-2">
                            {['True', 'False'].map((o) => <div key={o} className="py-2 text-center border border-gray-700 rounded-lg text-sm text-gray-300">{o}</div>)}
                          </div>
                        )}
                        {form.question_type === 'multiple_choice' && (
                          <div className="space-y-2">
                            {form.options.map((o, i) => o.trim() && (
                              <div key={i} className="flex items-center gap-2 py-2 px-3 border border-gray-700 rounded-lg text-sm text-gray-300">
                                <div className="w-4 h-4 rounded-full border border-gray-600" />
                                {o}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </MerchantCardContent>
                  </MerchantCard>
                </motion.div>
              )}

              {/* ── STEP 3: AUDIENCE ── */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="grid md:grid-cols-2 gap-6">
                  <MerchantCard className="shadow-xl">
                    <MerchantCardHeader>
                      <MerchantCardTitle className="text-white">Audience</MerchantCardTitle>
                      <p className="text-sm text-gray-400">Choose who will see your feedback campaign</p>
                    </MerchantCardHeader>
                    <MerchantCardContent className="space-y-4">
                      <div>
                        <MerchantLabel>Target Audience</MerchantLabel>
                        <div className="space-y-2 mt-2">
                          {[
                            { v: 'all_supporters', l: 'All Supporters', d: 'Show to all your supporters' },
                            { v: 'followers', l: 'Followers', d: 'Show to people following your organization' },
                            { v: 'past_buyers', l: 'Past Buyers', d: 'Show to supporters who have purchased from you' },
                            { v: 'by_cause', l: 'By Cause', d: 'Show to supporters interested in a specific cause' },
                          ].map((opt) => (
                            <button key={opt.v} type="button" onClick={() => setField('target_audience', opt.v)}
                              className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${form.target_audience === opt.v ? 'border-[#2563EB] bg-[#2563EB]/10' : 'border-gray-700/50 bg-gray-900/30 hover:border-gray-600'}`}>
                              <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${form.target_audience === opt.v ? 'border-[#2563EB]' : 'border-gray-600'}`}>
                                {form.target_audience === opt.v && <div className="w-2 h-2 rounded-full bg-[#2563EB]" />}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{opt.l}</p>
                                <p className="text-xs text-gray-500">{opt.d}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <MerchantLabel>Minimum Age</MerchantLabel>
                          <Select value={form.min_age} onValueChange={(v) => setField('min_age', v)}>
                            <SelectTrigger className="mt-1 bg-gray-900/50 border-[#2563EB]/40 text-white text-sm"><SelectValue placeholder="Any" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any">Any</SelectItem>
                              <SelectItem value="18">18+</SelectItem>
                              <SelectItem value="21">21+</SelectItem>
                              <SelectItem value="25">25+</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <MerchantLabel>Location</MerchantLabel>
                          <Select value={form.location} onValueChange={(v) => setField('location', v)}>
                            <SelectTrigger className="mt-1 bg-gray-900/50 border-[#2563EB]/40 text-white text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all_locations">All Locations</SelectItem>
                              <SelectItem value="us">United States</SelectItem>
                              <SelectItem value="global">Global</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </MerchantCardContent>
                  </MerchantCard>

                  {/* Audience Estimate */}
                  <MerchantCard className="shadow-xl">
                    <MerchantCardHeader>
                      <MerchantCardTitle className="text-white">Audience Estimate</MerchantCardTitle>
                    </MerchantCardHeader>
                    <MerchantCardContent className="flex flex-col items-center justify-center py-8">
                      <div className="flex gap-1 mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Users key={i} className={`h-8 w-8 ${i < 4 ? 'text-[#2563EB]' : 'text-gray-700'}`} />
                        ))}
                      </div>
                      <p className="text-5xl font-extrabold text-white mb-1">{maxResponses.toLocaleString()}</p>
                      <p className="text-gray-400 text-sm">Estimated Reach</p>
                      <p className="text-xs text-gray-600 mt-3 text-center">This is an estimate of how many supporters are likely to see your feedback campaign.</p>
                    </MerchantCardContent>
                  </MerchantCard>
                </motion.div>
              )}

              {/* ── STEP 4: REVIEW & LAUNCH ── */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="grid md:grid-cols-2 gap-6">
                  <MerchantCard className="shadow-xl">
                    <MerchantCardHeader>
                      <MerchantCardTitle className="text-white">Campaign Summary</MerchantCardTitle>
                    </MerchantCardHeader>
                    <MerchantCardContent className="space-y-3">
                      {[
                        ['Campaign Title', form.title],
                        ['Type', campaignTypes.find(t => t.value === form.type)?.label || form.type],
                        ['Reward Per Response', `${reward} BRP (= $${(reward * 0.01).toFixed(2)})`],
                        ['Total Budget', `${budget.toLocaleString()} BRP (= $${(budget * 0.01).toFixed(2)})`],
                        ['Max Responses', maxResponses.toLocaleString()],
                        ['Estimated Time', selectedType?.est_time || '—'],
                        ['Question Type', form.question_type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())],
                        ['Audience', form.target_audience.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())],
                        ['Estimated Reach', maxResponses.toLocaleString() + ' Supporters'],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between text-sm border-b border-gray-800/50 pb-2 last:border-0 last:pb-0">
                          <span className="text-gray-400">{k}</span>
                          <span className="text-white font-medium text-right max-w-[55%]">{v}</span>
                        </div>
                      ))}
                    </MerchantCardContent>
                  </MerchantCard>

                  <div className="space-y-4">
                    <MerchantCard className="shadow-xl border border-[#2563EB]/30">
                      <MerchantCardContent className="p-5 space-y-3">
                        <p className="text-sm font-semibold text-gray-300 uppercase tracking-wide">BRP Wallet</p>
                        <div className="flex justify-between text-sm"><span className="text-gray-400">Current Balance</span><span className="text-white font-bold">{wallet.balance_brp.toLocaleString()} BRP</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-400">Required for campaign</span><span className="text-amber-400 font-bold">{budget.toLocaleString()} BRP</span></div>
                        <div className="h-px bg-gray-800" />
                        <div className="flex justify-between text-sm"><span className="text-gray-400">After Launch Balance</span>
                          <span className={`font-bold ${wallet.balance_brp - budget >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {(wallet.balance_brp - budget).toLocaleString()} BRP
                          </span>
                        </div>
                        {!insufficientBalance ? (
                          <p className="text-xs text-emerald-400 flex items-center gap-1"><Check className="h-3.5 w-3.5" />You have enough BRP to launch this campaign</p>
                        ) : (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                            <p className="text-xs text-amber-400">Not enough BRP. <Link href="/wallet/brp/buy" className="underline">Buy BRP →</Link></p>
                          </div>
                        )}
                      </MerchantCardContent>
                    </MerchantCard>

                    <MerchantButton
                      onClick={submit}
                      disabled={submitting || insufficientBalance}
                      className="w-full py-4 text-base font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50"
                    >
                      <Rocket className="h-5 w-5 mr-2" />
                      {submitting ? 'Creating...' : 'Launch Campaign →'}
                    </MerchantButton>
                    {insufficientBalance && (
                      <Link href="/wallet/brp/buy">
                        <MerchantButton variant="outline" className="w-full border-[#2563EB] text-[#2563EB]">Buy BRP First</MerchantButton>
                      </Link>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-2">
              <MerchantButton type="button" variant="outline" onClick={prev} disabled={step === 0}>
                <ArrowLeft className="h-4 w-4 mr-2" />Back
              </MerchantButton>
              {step < 3 ? (
                <MerchantButton type="button" onClick={next} className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8]">
                  Next: {STEPS[step + 1]} <ArrowRight className="h-4 w-4 ml-2" />
                </MerchantButton>
              ) : null}
            </div>

          </motion.div>
        </div>
      </MerchantDashboardLayout>
    </>
  )
}
