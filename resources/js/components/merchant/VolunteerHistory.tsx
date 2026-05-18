import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Coins, CheckCircle2, Clock, Calendar, Filter } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface HistoryEntry {
  id: string
  type: 'volunteer' | 'digital_action'
  title: string
  organization?: string
  merchantName?: string
  pointsAwarded: number
  date: string
  status: 'verified' | 'pending' | 'rejected'
  verificationMethod?: string
  hoursLogged?: number
}

interface VolunteerHistoryProps {
  entries: HistoryEntry[]
  onFilterChange?: (filter: 'all' | 'volunteer' | 'digital' | 'verified' | 'pending') => void
  currentFilter?: 'all' | 'volunteer' | 'digital' | 'verified' | 'pending'
}

export function VolunteerHistory({ entries, onFilterChange, currentFilter = 'all' }: VolunteerHistoryProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        )
      case 'pending':
        return (
          <Badge className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="destructive">
            Rejected
          </Badge>
        )
      default:
        return null
    }
  }

  const totalPoints = entries
    .filter(e => e.status === 'verified')
    .reduce((sum, e) => sum + e.pointsAwarded, 0)

  const pendingPoints = entries
    .filter(e => e.status === 'pending')
    .reduce((sum, e) => sum + e.pointsAwarded, 0)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Earned</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {totalPoints.toLocaleString()}
                </p>
              </div>
              <Coins className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {pendingPoints.toLocaleString()}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Activities</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {entries.length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-gray-600 dark:text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        {(['all', 'volunteer', 'digital', 'verified', 'pending'] as const).map((filter) => (
          <Button
            key={filter}
            variant={currentFilter === filter ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange?.(filter)}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </Button>
        ))}
      </div>

      {/* History List */}
      <div className="space-y-4">
        {entries.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                No history found. Start earning points by volunteering or completing digital actions!
              </p>
            </CardContent>
          </Card>
        ) : (
          entries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {entry.title}
                      </h3>
                      {getStatusBadge(entry.status)}
                    </div>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      {entry.organization && (
                        <p>Organization: {entry.organization}</p>
                      )}
                      {entry.merchantName && (
                        <p>Merchant: {entry.merchantName}</p>
                      )}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{entry.date}</span>
                        </div>
                        {entry.hoursLogged && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{entry.hoursLogged} hours</span>
                          </div>
                        )}
                        {entry.verificationMethod && (
                          <span>Verified via {entry.verificationMethod}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Coins className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                      +{entry.pointsAwarded.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

