import React, { useEffect } from 'react'
import { Head, Link, usePage, useForm } from '@inertiajs/react'
import AppLayout from '@/layouts/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Plus, Trash2, Save, AlertCircle } from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast'
import { ofb } from './theme'

interface CampaignType { value: string; label: string; default_reward: number; est_time: string }

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
  organization: { id: number; name: string }
}

export default function OrgEditCampaign({ campaign, wallet, campaignTypes, organization }: Props) {
  const { props } = usePage<{ success?: string; error?: string }>()

  const { data, setData, put, processing, errors } = useForm({
    title: campaign.title,
    type: campaign.type,
    reward_per_response_brp: campaign.reward_per_response_brp,
    total_budget_brp: campaign.total_budget_brp,
    question_text: campaign.question_text,
    question_type: campaign.question_type as 'yes_no' | 'true_false' | 'multiple_choice',
    options: campaign.options.length >= 2 ? campaign.options : ['', ''],
    starts_at: campaign.starts_at ?? '',
    ends_at: campaign.ends_at ?? '',
  })

  useEffect(() => {
    if (props.success) showSuccessToast(props.success)
    if (props.error) showErrorToast(props.error)
  }, [props.success, props.error])

  const reward = data.reward_per_response_brp || 0
  const budget = data.total_budget_brp || 0
  const maxResponses = reward > 0 ? Math.floor(budget / reward) : 0
  const selectedType = campaignTypes.find((t) => t.value === data.type)
  const insufficientBalance = wallet.available_brp < budget

  const addOption = () => { if (data.options.length < 6) setData('options', [...data.options, '']) }
  const removeOption = (i: number) => { if (data.options.length > 2) setData('options', data.options.filter((_, idx) => idx !== i)) }
  const updateOption = (i: number, v: string) => { const o = [...data.options]; o[i] = v; setData('options', o) }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    put(`/organization/feedback-rewards/${campaign.id}`, {
      onSuccess: () => {},
    })
  }

  return (
    <AppLayout>
      <Head title="Edit Feedback Campaign" />
      <div className="w-full max-w-none py-8 px-4 sm:px-6 lg:px-8 space-y-6">

        <div className="flex items-center gap-4">
          <Link href={`/organization/feedback-rewards/${campaign.id}`}>
            <Button variant="outline" size="sm" className={ofb.btnOutline}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
          </Link>
          <div>
            <h1 className={`text-2xl font-bold ${ofb.titleGradient}`}>Edit Campaign</h1>
            <p className="text-sm text-muted-foreground">{organization.name}</p>
          </div>
        </div>

        <form onSubmit={submit}>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Setup */}
            <Card className={ofb.border}>
              <CardHeader><CardTitle>Campaign Setup</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Campaign Title *</Label>
                  <Input value={data.title} onChange={(e) => setData('title', e.target.value)} className={`mt-1 ${errors.title ? 'border-destructive' : ''}`} />
                  {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
                </div>
                <div>
                  <Label>Campaign Type</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {campaignTypes.map((ct) => (
                      <button key={ct.value} type="button"
                        onClick={() => { setData('type', ct.value); setData('reward_per_response_brp', ct.default_reward) }}
                        className={`p-3 rounded-xl border text-left transition-all ${data.type === ct.value ? ofb.selected : 'border-border hover:border-muted-foreground/40'}`}>
                        <p className="text-xs font-semibold">{ct.label}</p>
                        <p className={`text-xs font-bold ${ofb.text}`}>{ct.default_reward} BP</p>
                        <p className="text-xs text-muted-foreground">{ct.est_time}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Reward Per Response (BP)</Label>
                  <Input type="number" min={1} value={data.reward_per_response_brp}
                    onChange={(e) => setData('reward_per_response_brp', Number(e.target.value))}
                    className={`mt-1 ${errors.reward_per_response_brp ? 'border-destructive' : ''}`} />
                  {errors.reward_per_response_brp && <p className="text-xs text-destructive mt-1">{errors.reward_per_response_brp}</p>}
                </div>
                <div>
                  <Label>Total Budget (BRP)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input type="number" min={1} value={data.total_budget_brp}
                      onChange={(e) => setData('total_budget_brp', Number(e.target.value))}
                      className={errors.total_budget_brp ? 'border-destructive' : ''} />
                    <div className="px-3 py-2 rounded-lg bg-muted/50 border text-sm whitespace-nowrap">BRP</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Max responses: {maxResponses.toLocaleString()}</p>
                  {errors.total_budget_brp && <p className="text-xs text-destructive mt-1">{errors.total_budget_brp}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Date (optional)</Label>
                    <input
                      type="date"
                      value={data.starts_at}
                      onChange={(e) => setData('starts_at', e.target.value)}
                      className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 ${ofb.focus}`}
                    />
                  </div>
                  <div>
                    <Label>End Date (optional)</Label>
                    <input
                      type="date"
                      value={data.ends_at}
                      onChange={(e) => setData('ends_at', e.target.value)}
                      className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 ${ofb.focus}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right: Question + Save */}
            <Card className={ofb.border}>
              <CardHeader><CardTitle>Question</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Question Type</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {[{ v: 'yes_no', l: 'Yes / No' }, { v: 'true_false', l: 'True / False' }, { v: 'multiple_choice', l: 'Multiple Choice' }].map((qt) => (
                      <button key={qt.v} type="button" onClick={() => setData('question_type', qt.v as any)}
                        className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${data.question_type === qt.v ? `${ofb.selected} text-foreground` : 'border-border text-muted-foreground hover:border-muted-foreground/40'}`}>
                        {qt.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Question *</Label>
                  <Textarea value={data.question_text} onChange={(e) => setData('question_text', e.target.value)}
                    rows={3} className={`mt-1 ${errors.question_text ? 'border-destructive' : ''}`} />
                  {errors.question_text && <p className="text-xs text-destructive mt-1">{errors.question_text}</p>}
                </div>
                {data.question_type === 'yes_no' && (
                  <div className="grid grid-cols-2 gap-2">
                    {['Yes', 'No'].map((o) => <div key={o} className="py-2 text-center border rounded-lg text-sm text-muted-foreground">{o}</div>)}
                  </div>
                )}
                {data.question_type === 'true_false' && (
                  <div className="grid grid-cols-2 gap-2">
                    {['True', 'False'].map((o) => <div key={o} className="py-2 text-center border rounded-lg text-sm text-muted-foreground">{o}</div>)}
                  </div>
                )}
                {data.question_type === 'multiple_choice' && (
                  <div className="space-y-2">
                    <Label>Answer Options (min 2, max 6)</Label>
                    {data.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-6">Option {String.fromCharCode(65 + i)}</span>
                        <Input value={opt} onChange={(e) => updateOption(i, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + i)}`} className="flex-1 text-sm" />
                        {data.options.length > 2 && (
                          <button type="button" onClick={() => removeOption(i)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button>
                        )}
                      </div>
                    ))}
                    {data.options.length < 6 && (
                      <Button type="button" variant="outline" size="sm" onClick={addOption}><Plus className="h-3.5 w-3.5 mr-1" />Add Option</Button>
                    )}
                    {errors.options && <p className="text-xs text-destructive mt-1">{errors.options}</p>}
                  </div>
                )}

                <div className="pt-2 space-y-2">
                  {insufficientBalance && budget > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <p className="text-xs text-amber-500">Insufficient BRP balance.</p>
                    </div>
                  )}
                  <Button type="submit" disabled={processing || insufficientBalance}
                    className={`w-full disabled:opacity-50 ${ofb.btn}`}>
                    <Save className="h-4 w-4 mr-2" />
                    {processing ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
