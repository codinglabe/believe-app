import React, { useEffect } from 'react'
import { Head, Link, usePage, router } from '@inertiajs/react'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantInput } from '@/components/merchant-ui'
import { MerchantLabel } from '@/components/merchant-ui'
import { MerchantTextarea } from '@/components/merchant-ui'
import { MerchantDashboardLayout } from '@/components/merchant'
import { ArrowLeft, Plus, Trash2, Save, AlertCircle } from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast'

interface CampaignType {
  value: string
  label: string
  default_reward: number
  est_time: string
  per_response_bp_display: number
}

interface Props {
  campaign: {
    id: number
    title: string
    type: string
    reward_per_response_brp: number
    total_budget_brp: number
    starts_at: string | null
    ends_at: string | null
    question_text: string
    question_type: 'yes_no' | 'true_false' | 'multiple_choice'
    options: string[]
  }
  wallet: { balance_brp: number; available_brp: number }
  campaignTypes: CampaignType[]
}

function formatDisplayBp(n: number): string {
  return `${n.toFixed(2)} BP`
}

export default function EditCampaign({ campaign, wallet, campaignTypes }: Props) {
  const { props } = usePage<{ success?: string; error?: string }>()
  const [processing, setProcessing] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const budgetBp = Math.round(campaign.total_budget_brp / 100)

  const [data, setDataState] = React.useState({
    title: campaign.title,
    type: campaign.type,
    reward_per_response_brp: campaign.reward_per_response_brp,
    total_budget_bp: budgetBp,
    question_text: campaign.question_text,
    question_type: campaign.question_type as 'yes_no' | 'true_false' | 'multiple_choice',
    options: campaign.options.length >= 2 ? campaign.options : ['', ''],
    starts_at: campaign.starts_at ?? '',
    ends_at: campaign.ends_at ?? '',
  })

  const setData = (key: string, val: any) => setDataState((f) => ({ ...f, [key]: val }))

  useEffect(() => {
    if (props.success) showSuccessToast(props.success)
    if (props.error) showErrorToast(props.error)
  }, [props.success, props.error])

  const reward = data.reward_per_response_brp || 0
  const budget = data.total_budget_bp || 0
  const maxResponses = reward > 0 ? Math.floor((budget * 100) / reward) : 0
  const selectedType = campaignTypes.find((t) => t.value === data.type)
  const insufficientBalance = wallet.available_brp < budget

  const addOption = () => { if (data.options.length < 6) setData('options', [...data.options, '']) }
  const removeOption = (i: number) => { if (data.options.length > 2) setData('options', data.options.filter((_, idx) => idx !== i)) }
  const updateOption = (i: number, v: string) => { const o = [...data.options]; o[i] = v; setData('options', o) }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    router.put(`/feedback-rewards/${campaign.id}`, {
      title: data.title,
      type: data.type,
      reward_per_response_brp: data.reward_per_response_brp,
      total_budget_brp: data.total_budget_bp * 100,
      question_text: data.question_text,
      question_type: data.question_type,
      options: data.options,
      starts_at: data.starts_at || null,
      ends_at: data.ends_at || null,
    }, {
      onError: (errs) => { setErrors(errs); setProcessing(false) },
      onFinish: () => setProcessing(false),
    })
  }

  return (
    <>
      <Head title="Edit Feedback Campaign" />
      <MerchantDashboardLayout>
        <div className="w-full max-w-4xl mx-auto space-y-6">

          <div className="flex items-center gap-4">
            <Link href={`/feedback-rewards/${campaign.id}`}>
              <MerchantButton variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</MerchantButton>
            </Link>
            <h1 className="text-2xl font-bold text-white">Edit Campaign</h1>
          </div>

          <form onSubmit={submit}>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left: Setup */}
              <MerchantCard className="shadow-xl">
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white">Campaign Setup</MerchantCardTitle>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-4">
                  <div>
                    <MerchantLabel>Campaign Title *</MerchantLabel>
                    <MerchantInput value={data.title} onChange={(e) => setData('title', e.target.value)}
                      className={`mt-1 ${errors.title ? 'border-red-500' : ''}`} />
                    {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
                  </div>
                  <div>
                    <MerchantLabel>Campaign Type</MerchantLabel>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {campaignTypes.map((ct) => (
                        <button key={ct.value} type="button"
                          onClick={() => { setData('type', ct.value); setData('reward_per_response_brp', ct.default_reward) }}
                          className={`p-3 rounded-xl border text-left transition-all ${data.type === ct.value ? 'border-[#2563EB] bg-[#2563EB]/10' : 'border-gray-700/60 bg-gray-900/40 hover:border-gray-600'}`}>
                          <p className="text-xs font-semibold text-white">{ct.label}</p>
                          <p className="text-xs text-[#2563EB] font-bold">{formatDisplayBp(ct.per_response_bp_display)}</p>
                          <p className="text-xs text-gray-500">{ct.est_time}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <MerchantLabel>Reward per response</MerchantLabel>
                    <MerchantInput type="number" min={1} value={data.reward_per_response_brp}
                      onChange={(e) => setData('reward_per_response_brp', Number(e.target.value))}
                      className={`mt-1 ${errors.reward_per_response_brp ? 'border-red-500' : ''}`} />
                    {errors.reward_per_response_brp && <p className="text-xs text-red-400 mt-1">{errors.reward_per_response_brp}</p>}
                  </div>
                  <div>
                    <MerchantLabel>Total Budget (BP)</MerchantLabel>
                    <div className="flex gap-2 mt-1">
                      <MerchantInput type="number" min={1} value={data.total_budget_bp}
                        onChange={(e) => setData('total_budget_bp', Number(e.target.value))}
                        className={errors.total_budget_brp ? 'border-red-500' : ''} />
                      <div className="px-3 py-2 rounded-lg bg-gray-900/50 border border-gray-700/50 text-gray-400 text-sm whitespace-nowrap">BP</div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Max responses: {maxResponses.toLocaleString()}</p>
                    {errors.total_budget_brp && <p className="text-xs text-red-400 mt-1">{errors.total_budget_brp}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <MerchantLabel>Start Date (optional)</MerchantLabel>
                      <input
                        type="date"
                        value={data.starts_at}
                        onChange={(e) => setData('starts_at', e.target.value)}
                        className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700/50 text-white text-sm focus:outline-none focus:border-[#2563EB] [color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <MerchantLabel>End Date (optional)</MerchantLabel>
                      <input
                        type="date"
                        value={data.ends_at}
                        onChange={(e) => setData('ends_at', e.target.value)}
                        className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700/50 text-white text-sm focus:outline-none focus:border-[#2563EB] [color-scheme:dark]"
                      />
                    </div>
                  </div>
                </MerchantCardContent>
              </MerchantCard>

              {/* Right: Question + Save */}
              <MerchantCard className="shadow-xl">
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white">Question</MerchantCardTitle>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-4">
                  <div>
                    <MerchantLabel>Question Type</MerchantLabel>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {[{ v: 'yes_no', l: 'Yes / No' }, { v: 'true_false', l: 'True / False' }, { v: 'multiple_choice', l: 'Multiple Choice' }].map((qt) => (
                        <button key={qt.v} type="button" onClick={() => setData('question_type', qt.v as any)}
                          className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${data.question_type === qt.v ? 'border-[#2563EB] bg-[#2563EB]/10 text-white' : 'border-gray-700/50 text-gray-400 hover:border-gray-600'}`}>
                          {qt.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <MerchantLabel>Question *</MerchantLabel>
                    <MerchantTextarea value={data.question_text} onChange={(e) => setData('question_text', e.target.value)}
                      rows={3} className={`mt-1 ${errors.question_text ? 'border-red-500' : ''}`} />
                    {errors.question_text && <p className="text-xs text-red-400 mt-1">{errors.question_text}</p>}
                  </div>
                  {data.question_type === 'yes_no' && (
                    <div className="grid grid-cols-2 gap-2">
                      {['Yes', 'No'].map((o) => <div key={o} className="py-2 text-center border border-gray-700 rounded-lg text-sm text-gray-300">{o}</div>)}
                    </div>
                  )}
                  {data.question_type === 'true_false' && (
                    <div className="grid grid-cols-2 gap-2">
                      {['True', 'False'].map((o) => <div key={o} className="py-2 text-center border border-gray-700 rounded-lg text-sm text-gray-300">{o}</div>)}
                    </div>
                  )}
                  {data.question_type === 'multiple_choice' && (
                    <div className="space-y-2">
                      <MerchantLabel>Answer Options (min 2, max 6)</MerchantLabel>
                      {data.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-5">Option {String.fromCharCode(65 + i)}</span>
                          <MerchantInput value={opt} onChange={(e) => updateOption(i, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + i)}`} className="flex-1 text-sm" />
                          {data.options.length > 2 && (
                            <button type="button" onClick={() => removeOption(i)} className="text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
                          )}
                        </div>
                      ))}
                      {data.options.length < 6 && (
                        <MerchantButton type="button" variant="outline" size="sm" onClick={addOption}><Plus className="h-3.5 w-3.5 mr-1" />Add Option</MerchantButton>
                      )}
                      {errors.options && <p className="text-xs text-red-400 mt-1">{errors.options}</p>}
                    </div>
                  )}

                  <div className="pt-2 space-y-2">
                    {insufficientBalance && budget > 0 && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                        <p className="text-xs text-amber-400">Not enough BP in your wallet. <Link href="/wallet/brp/buy" className="underline">Buy BP →</Link></p>
                      </div>
                    )}
                    <MerchantButton type="submit" disabled={processing || insufficientBalance}
                      className="w-full bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#FF1FA3] hover:via-[#EC1F4C] hover:to-[#F98461] py-3">
                      <Save className="h-4 w-4 mr-2" />
                      {processing ? 'Saving...' : 'Save Changes'}
                    </MerchantButton>
                  </div>
                </MerchantCardContent>
              </MerchantCard>
            </div>
          </form>
        </div>
      </MerchantDashboardLayout>
    </>
  )
}
