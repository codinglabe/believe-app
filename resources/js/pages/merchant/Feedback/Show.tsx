import React, { useEffect, useState } from 'react'
import { Head, useForm, usePage } from '@inertiajs/react'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { MerchantButton } from '@/components/merchant-ui'
import { MessageSquare, Gift, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { showSuccessToast, showErrorToast } from '@/lib/toast'

interface Option {
  id: number
  option_text: string
}

interface Question {
  id: number
  question_text: string
  question_type: string
  options: Option[]
}

interface Campaign {
  uuid: string
  title: string
  type: string
  reward_per_response_brp: number
  reward_dollars: number
  estimated_time: string
  merchant_name: string
  questions: Question[]
}

interface Props {
  campaign: Campaign
  alreadyResponded: boolean
}

const typeLabels: Record<string, string> = {
  quick_vote: 'Quick Vote',
  short_feedback: 'Short Feedback',
  standard_survey: 'Standard Survey',
  deep_feedback: 'Deep Feedback',
}

export default function SupporterFeedback({ campaign, alreadyResponded }: Props) {
  const [answers, setAnswers] = useState<Record<number, { answer_text: string; option_id: number | null }>>({})
  const { post, processing, errors, transform } = useForm<{ answers: Array<{ question_id: number; answer_text: string; option_id: number | null }> }>({
    answers: [],
  })
  const { props } = usePage<{ success?: string; error?: string }>()
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (props.success) {
      showSuccessToast(props.success)
      setSubmitted(true)
    }
    if (props.error) showErrorToast(props.error)
  }, [props.success, props.error])

  const setAnswer = (questionId: number, answerText: string, optionId: number | null = null) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { answer_text: answerText, option_id: optionId },
    }))
  }

  const allAnswered = campaign.questions.every((q) => answers[q.id]?.answer_text)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formattedAnswers = campaign.questions.map((q) => ({
      question_id: q.id,
      answer_text: answers[q.id]?.answer_text || '',
      option_id: answers[q.id]?.option_id || null,
    }))

    transform(() => ({ answers: formattedAnswers }))
    post(`/feedback/${campaign.uuid}`, {
      onSuccess: () => setSubmitted(true),
    })
  }

  if (alreadyResponded || submitted) {
    return (
      <>
        <Head title={`${campaign.title} - Feedback`} />
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-md w-full"
          >
            <MerchantCard className="shadow-2xl text-center">
              <MerchantCardContent className="p-8">
                <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">
                  {submitted ? 'Thank You!' : 'Already Responded'}
                </h2>
                <p className="text-gray-400 mb-4">
                  {submitted
                    ? `You earned ${campaign.reward_per_response_brp} BP ($${campaign.reward_dollars}) for your feedback!`
                    : 'You have already submitted your response to this campaign.'
                  }
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  <Gift className="h-4 w-4" />
                  <span className="font-semibold">{campaign.reward_per_response_brp} BP Earned</span>
                </div>
              </MerchantCardContent>
            </MerchantCard>
          </motion.div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head title={`${campaign.title} - Feedback`} />
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="max-w-lg w-full space-y-6"
        >
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/30 text-sm text-[#2563EB] mb-4">
              <MessageSquare className="h-3.5 w-3.5" />
              {typeLabels[campaign.type]}
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">{campaign.title}</h1>
            <p className="text-gray-400 text-sm mb-1">by {campaign.merchant_name}</p>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Gift className="h-3.5 w-3.5 text-emerald-400" /> Earn {campaign.reward_per_response_brp} BP</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {campaign.estimated_time}</span>
            </div>
          </div>



          {/* Questions */}
          <form onSubmit={handleSubmit}>
            {campaign.questions.map((question, qi) => (
              <MerchantCard key={question.id} className="shadow-xl mb-4">
                <MerchantCardContent className="p-5">
                  <h3 className="text-white font-medium mb-4">{question.question_text}</h3>

                  {/* Yes/No */}
                  {question.question_type === 'yes_no' && (
                    <div className="grid grid-cols-2 gap-3">
                      {['Yes', 'No'].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setAnswer(question.id, option)}
                          className={`py-3 rounded-lg border text-sm font-medium transition-all ${
                            answers[question.id]?.answer_text === option
                              ? 'bg-[#2563EB]/15 border-[#2563EB] text-white'
                              : 'bg-gray-900/50 border-gray-700/50 text-gray-400 hover:border-gray-600'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* True/False */}
                  {question.question_type === 'true_false' && (
                    <div className="grid grid-cols-2 gap-3">
                      {['True', 'False'].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setAnswer(question.id, option)}
                          className={`py-3 rounded-lg border text-sm font-medium transition-all ${
                            answers[question.id]?.answer_text === option
                              ? 'bg-[#2563EB]/15 border-[#2563EB] text-white'
                              : 'bg-gray-900/50 border-gray-700/50 text-gray-400 hover:border-gray-600'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Multiple Choice */}
                  {question.question_type === 'multiple_choice' && (
                    <div className="space-y-2">
                      {question.options.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setAnswer(question.id, option.option_text, option.id)}
                          className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                            answers[question.id]?.option_id === option.id
                              ? 'bg-[#2563EB]/15 border-[#2563EB] text-white'
                              : 'bg-gray-900/50 border-gray-700/50 text-gray-400 hover:border-gray-600'
                          }`}
                        >
                          {option.option_text}
                        </button>
                      ))}
                    </div>
                  )}
                </MerchantCardContent>
              </MerchantCard>
            ))}

            {/* Submit */}
            <MerchantButton
              type="submit"
              disabled={processing || !allAnswered}
              className="w-full bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#FF1FA3] hover:via-[#EC1F4C] hover:to-[#F98461] py-3"
            >
              {processing ? 'Submitting...' : `Submit & Earn ${campaign.reward_per_response_brp} BP`}
            </MerchantButton>

            {!allAnswered && (
              <p className="text-center text-xs text-gray-500 mt-2 flex items-center justify-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Please answer all questions to submit
              </p>
            )}

            {errors.answers && (
              <p className="text-center text-xs text-red-400 mt-2">
                {errors.answers}
              </p>
            )}
          </form>
        </motion.div>
      </div>
    </>
  )
}
