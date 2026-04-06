import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Clock, Coins, CheckCircle2, QrCode, FileText, UserCheck, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'

interface VerificationMethod {
  type: 'admin_approval' | 'qr_checkin' | 'signin_form' | 'admin_review' | 'time_based'
  label: string
  icon: React.ReactNode
}

interface VolunteerOpportunity {
  id: string
  title: string
  organization: string
  description: string
  date: string
  time: string
  location: string
  pointsAwarded: number
  verificationMethods: VerificationMethod[]
  status: 'upcoming' | 'active' | 'completed' | 'verified'
  hoursRequired?: number
  maxParticipants?: number
  currentParticipants?: number
}

interface VolunteerOpportunityCardProps {
  opportunity: VolunteerOpportunity
  onJoin?: () => void
  onVerify?: () => void
  onCheckIn?: () => void
}

const verificationIcons = {
  admin_approval: <UserCheck className="w-4 h-4" />,
  qr_checkin: <QrCode className="w-4 h-4" />,
  signin_form: <FileText className="w-4 h-4" />,
  admin_review: <CheckCircle2 className="w-4 h-4" />,
  time_based: <Clock className="w-4 h-4" />
}

export function VolunteerOpportunityCard({
  opportunity,
  onJoin,
  onVerify,
  onCheckIn
}: VolunteerOpportunityCardProps) {
  const getStatusBadge = () => {
    switch (opportunity.status) {
      case 'upcoming':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Upcoming</Badge>
      case 'active':
        return <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</Badge>
      case 'completed':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400">Completed</Badge>
      case 'verified':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Verified</Badge>
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
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">{opportunity.title}</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {opportunity.organization}
              </p>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">
            {opportunity.description}
          </p>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>{opportunity.date}</span>
              <span className="mx-1">•</span>
              <Clock className="w-4 h-4" />
              <span>{opportunity.time}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4" />
              <span>{opportunity.location}</span>
            </div>
            {opportunity.hoursRequired && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>{opportunity.hoursRequired} hours required</span>
              </div>
            )}
            {opportunity.maxParticipants && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Users className="w-4 h-4" />
                <span>
                  {opportunity.currentParticipants || 0} / {opportunity.maxParticipants} participants
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Coins className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {opportunity.pointsAwarded.toLocaleString()} Points
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              (Verified only)
            </span>
          </div>

          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
              Verification Methods:
            </p>
            <div className="flex flex-wrap gap-2">
              {opportunity.verificationMethods.map((method, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {verificationIcons[method.type]}
                  <span className="ml-1">{method.label}</span>
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            {opportunity.status === 'upcoming' && onJoin && (
              <Button className="flex-1" onClick={onJoin}>
                Join Event
              </Button>
            )}
            {opportunity.status === 'active' && onCheckIn && (
              <Button className="flex-1" variant="outline" onClick={onCheckIn}>
                <QrCode className="w-4 h-4 mr-2" />
                Check In
              </Button>
            )}
            {opportunity.status === 'completed' && onVerify && (
              <Button className="flex-1" variant="outline" onClick={onVerify}>
                Submit Verification
              </Button>
            )}
            {opportunity.status === 'verified' && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 flex-1 justify-center">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">Points Awarded</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

