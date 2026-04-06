import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Coins, CheckCircle2, Clock, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'

interface DigitalAction {
  id: string
  title: string
  description: string
  category: 'discovery' | 'feedback' | 'content' | 'promotion' | 'education'
  pointsAwarded: number
  merchantId?: string
  merchantName?: string
  status: 'available' | 'completed' | 'pending'
  isOneTime: boolean
  timeRequired?: number // in minutes
  requirements?: string[]
}

interface DigitalActionCardProps {
  action: DigitalAction
  onComplete?: () => void
  onStart?: () => void
}

const categoryColors = {
  discovery: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  feedback: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  content: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  promotion: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  education: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
}

const categoryLabels = {
  discovery: 'Discovery',
  feedback: 'Feedback',
  content: 'Content',
  promotion: 'Promotion',
  education: 'Education'
}

export function DigitalActionCard({ action, onComplete, onStart }: DigitalActionCardProps) {
  const getStatusBadge = () => {
    switch (action.status) {
      case 'available':
        return <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">Available</Badge>
      case 'completed':
        return (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Completed</span>
          </div>
        )
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</Badge>
      default:
        return null
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={categoryColors[action.category]}>
                  {categoryLabels[action.category]}
                </Badge>
                {action.isOneTime && (
                  <Badge variant="outline" className="text-xs">One-Time</Badge>
                )}
              </div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-1">
                {action.title}
              </h3>
              {action.merchantName && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {action.merchantName}
                </p>
              )}
            </div>
            {getStatusBadge()}
          </div>

          <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 line-clamp-2">
            {action.description}
          </p>

          {action.requirements && action.requirements.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Requirements:
              </p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                {action.requirements.map((req, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="mt-0.5">•</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {action.pointsAwarded} Points
              </span>
              {action.timeRequired && (
                <>
                  <span className="text-gray-400">•</span>
                  <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{action.timeRequired} min</span>
                  </div>
                </>
              )}
            </div>

            {action.status === 'available' && (
              <Button size="sm" onClick={onStart || onComplete}>
                {onStart ? 'Start' : 'Complete'}
              </Button>
            )}
            {action.status === 'pending' && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Awaiting verification
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

