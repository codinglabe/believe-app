import React, { useState } from 'react'
import { Head } from '@inertiajs/react'
import { MerchantHeader } from '@/components/merchant'
import { EarnPointsTabs } from '@/components/merchant/EarnPointsTabs'
import { TabsContent } from '@/components/ui/tabs'
import { VolunteerOpportunityCard } from '@/components/merchant/VolunteerOpportunityCard'
import { DigitalActionCard } from '@/components/merchant/DigitalActionCard'
import { VolunteerHistory } from '@/components/merchant/VolunteerHistory'
import { QRCheckIn } from '@/components/merchant/QRCheckIn'
import { VolunteerSignInForm } from '@/components/merchant/VolunteerSignInForm'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Search, Filter } from 'lucide-react'
import { motion } from 'framer-motion'

// Mock data - replace with actual data from backend
const mockVolunteerOpportunities = [
  {
    id: '1',
    title: 'Community Garden Cleanup',
    organization: 'Green Earth Nonprofit',
    description: 'Help maintain our community garden by weeding, planting, and organizing tools. Perfect for nature lovers!',
    date: 'March 15, 2024',
    time: '9:00 AM - 12:00 PM',
    location: 'Community Garden, 123 Main St',
    pointsAwarded: 150,
    verificationMethods: [
      { type: 'qr_checkin' as const, label: 'QR Check-In' },
      { type: 'signin_form' as const, label: 'Sign-In Form' },
      { type: 'admin_review' as const, label: 'Admin Review' }
    ],
    status: 'upcoming' as const,
    hoursRequired: 3,
    maxParticipants: 20,
    currentParticipants: 12
  },
  {
    id: '2',
    title: 'Food Bank Distribution',
    organization: 'Hope Food Bank',
    description: 'Assist with organizing and distributing food to families in need. Training provided on-site.',
    date: 'March 18, 2024',
    time: '10:00 AM - 2:00 PM',
    location: 'Hope Food Bank, 456 Oak Ave',
    pointsAwarded: 200,
    verificationMethods: [
      { type: 'qr_checkin' as const, label: 'QR Check-In' },
      { type: 'time_based' as const, label: 'Time-Based' }
    ],
    status: 'active' as const,
    hoursRequired: 4,
    maxParticipants: 15,
    currentParticipants: 8
  },
  {
    id: '3',
    title: 'Virtual Tutoring Session',
    organization: 'Education First',
    description: 'Provide online tutoring to students. Flexible hours, work from home.',
    date: 'Ongoing',
    time: 'Flexible',
    location: 'Virtual',
    pointsAwarded: 100,
    verificationMethods: [
      { type: 'time_based' as const, label: 'Time-Based' },
      { type: 'admin_review' as const, label: 'Admin Review' }
    ],
    status: 'upcoming' as const,
    hoursRequired: 2,
    maxParticipants: 50,
    currentParticipants: 25
  }
]

const mockDigitalActions = [
  {
    id: '1',
    title: 'Follow Tech Store',
    description: 'Follow Tech Store to stay updated on new products and exclusive offers.',
    category: 'discovery' as const,
    pointsAwarded: 25,
    merchantId: 'merchant_1',
    merchantName: 'Tech Store',
    status: 'available' as const,
    isOneTime: true
  },
  {
    id: '2',
    title: 'Complete Product Survey',
    description: 'Help us improve by answering 5 quick questions about our new product line.',
    category: 'feedback' as const,
    pointsAwarded: 50,
    merchantId: 'merchant_2',
    merchantName: 'Retail Store',
    status: 'available' as const,
    isOneTime: false,
    timeRequired: 3,
    requirements: ['Must view product listing first', 'Minimum 20 seconds on page']
  },
  {
    id: '3',
    title: 'Watch Educational Video',
    description: 'Learn about sustainable sourcing practices in a 5-minute video.',
    category: 'education' as const,
    pointsAwarded: 75,
    merchantId: 'merchant_3',
    merchantName: 'Eco Store',
    status: 'available' as const,
    isOneTime: true,
    timeRequired: 5,
    requirements: ['Watch full video (minimum 4:30)', 'Complete quiz at end']
  },
  {
    id: '4',
    title: 'Participate in Poll',
    description: 'Vote on which new service you\'d like to see next quarter.',
    category: 'feedback' as const,
    pointsAwarded: 30,
    merchantId: 'merchant_1',
    merchantName: 'Tech Store',
    status: 'completed' as const,
    isOneTime: true
  },
  {
    id: '5',
    title: 'Rate Service Experience',
    description: 'Share your experience after redeeming a service. Internal feedback only.',
    category: 'feedback' as const,
    pointsAwarded: 40,
    merchantId: 'merchant_2',
    merchantName: 'Retail Store',
    status: 'pending' as const,
    isOneTime: false
  }
]

const mockHistory = [
  {
    id: '1',
    type: 'volunteer' as const,
    title: 'Community Garden Cleanup',
    organization: 'Green Earth Nonprofit',
    pointsAwarded: 150,
    date: 'March 10, 2024',
    status: 'verified' as const,
    verificationMethod: 'QR Check-In',
    hoursLogged: 3
  },
  {
    id: '2',
    type: 'digital_action' as const,
    title: 'Complete Product Survey',
    merchantName: 'Retail Store',
    pointsAwarded: 50,
    date: 'March 12, 2024',
    status: 'verified' as const
  },
  {
    id: '3',
    type: 'volunteer' as const,
    title: 'Food Bank Distribution',
    organization: 'Hope Food Bank',
    pointsAwarded: 200,
    date: 'March 14, 2024',
    status: 'pending' as const,
    verificationMethod: 'Sign-In Form',
    hoursLogged: 4
  },
  {
    id: '4',
    type: 'digital_action' as const,
    title: 'Watch Educational Video',
    merchantName: 'Eco Store',
    pointsAwarded: 75,
    date: 'March 13, 2024',
    status: 'verified' as const
  }
]

export default function EarnPoints() {
  const [volunteerSearch, setVolunteerSearch] = useState('')
  const [digitalSearch, setDigitalSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [historyFilter, setHistoryFilter] = useState<'all' | 'volunteer' | 'digital' | 'verified' | 'pending'>('all')
  const [showQRCheckIn, setShowQRCheckIn] = useState(false)
  const [showSignInForm, setShowSignInForm] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<{ id: string; name: string } | null>(null)

  const filteredVolunteerOpportunities = mockVolunteerOpportunities.filter(opp =>
    opp.title.toLowerCase().includes(volunteerSearch.toLowerCase()) ||
    opp.organization.toLowerCase().includes(volunteerSearch.toLowerCase())
  )

  const filteredDigitalActions = mockDigitalActions.filter(action => {
    const matchesSearch = action.title.toLowerCase().includes(digitalSearch.toLowerCase()) ||
                         action.merchantName?.toLowerCase().includes(digitalSearch.toLowerCase())
    const matchesCategory = !selectedCategory || action.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const filteredHistory = mockHistory.filter(entry => {
    if (historyFilter === 'all') return true
    if (historyFilter === 'volunteer') return entry.type === 'volunteer'
    if (historyFilter === 'digital') return entry.type === 'digital_action'
    return entry.status === historyFilter
  })

  const handleJoinEvent = (opportunityId: string) => {
    console.log('Join event:', opportunityId)
    // In production, make API call to join event
  }

  const handleCheckIn = (opportunityId: string) => {
    const opportunity = mockVolunteerOpportunities.find(o => o.id === opportunityId)
    if (opportunity) {
      setSelectedEvent({ id: opportunityId, name: opportunity.title })
      setShowQRCheckIn(true)
    }
  }

  const handleVerify = (opportunityId: string) => {
    const opportunity = mockVolunteerOpportunities.find(o => o.id === opportunityId)
    if (opportunity) {
      setSelectedEvent({ id: opportunityId, name: opportunity.title })
      setShowSignInForm(true)
    }
  }

  const handleQRCheckIn = (code: string) => {
    console.log('QR Check-in:', code)
    setShowQRCheckIn(false)
    setSelectedEvent(null)
    // In production, make API call to verify check-in
  }

  const handleSignInSubmit = (data: any) => {
    console.log('Sign-in submitted:', data)
    setShowSignInForm(false)
    setSelectedEvent(null)
    // In production, make API call to submit sign-in
  }

  const handleDigitalAction = (actionId: string) => {
    console.log('Complete digital action:', actionId)
    // In production, make API call to complete action
  }

  const categories = ['all', 'discovery', 'feedback', 'content', 'promotion', 'education']

  return (
    <>
      <Head title="Earn Points - Believe" />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <MerchantHeader 
          title="Earn Points"
          showSearch
          onMenuClick={() => console.log('Menu clicked')}
          onSearchClick={() => console.log('Search clicked')}
        />

        <div className="container mx-auto px-4 pt-24 pb-6">
          <EarnPointsTabs>
            {/* Volunteer & Earn Tab */}
            <TabsContent value="volunteer" className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Volunteer & Earn
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Earn points by volunteering with verified nonprofits. All activities require verification before points are awarded.
                </p>

                {/* Search */}
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search volunteer opportunities..."
                    value={volunteerSearch}
                    onChange={(e) => setVolunteerSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Opportunities Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredVolunteerOpportunities.map((opportunity, index) => (
                    <motion.div
                      key={opportunity.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <VolunteerOpportunityCard
                        opportunity={opportunity}
                        onJoin={() => handleJoinEvent(opportunity.id)}
                        onCheckIn={() => handleCheckIn(opportunity.id)}
                        onVerify={() => handleVerify(opportunity.id)}
                      />
                    </motion.div>
                  ))}
                </div>

                {filteredVolunteerOpportunities.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-600 dark:text-gray-400">
                      No volunteer opportunities found. Try adjusting your search.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Digital Actions Tab */}
            <TabsContent value="digital" className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Digital Actions
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Earn points through safe, verified digital actions within the Believe platform. No physical presence required.
                </p>

                {/* Search and Filters */}
                <div className="space-y-4 mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search digital actions..."
                      value={digitalSearch}
                      onChange={(e) => setDigitalSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {categories.map((category) => (
                      <Button
                        key={category}
                        variant={selectedCategory === category || (!selectedCategory && category === 'all') ? 'default' : 'outline'}
                        onClick={() => setSelectedCategory(category === 'all' ? null : category)}
                        className="whitespace-nowrap"
                        size="sm"
                      >
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Digital Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredDigitalActions.map((action, index) => (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <DigitalActionCard
                        action={action}
                        onComplete={() => handleDigitalAction(action.id)}
                        onStart={() => handleDigitalAction(action.id)}
                      />
                    </motion.div>
                  ))}
                </div>

                {filteredDigitalActions.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-600 dark:text-gray-400">
                      No digital actions found. Try adjusting your search or filters.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  My Volunteer History
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Track all your volunteer activities and digital actions, including pending verifications.
                </p>

                <VolunteerHistory
                  entries={filteredHistory}
                  onFilterChange={setHistoryFilter}
                  currentFilter={historyFilter}
                />
              </div>
            </TabsContent>
          </EarnPointsTabs>
        </div>

        {/* QR Check-In Modal */}
        <Dialog open={showQRCheckIn} onOpenChange={setShowQRCheckIn}>
          <DialogContent className="max-w-md">
            {selectedEvent && (
              <QRCheckIn
                eventId={selectedEvent.id}
                eventName={selectedEvent.name}
                onCheckIn={handleQRCheckIn}
                onClose={() => {
                  setShowQRCheckIn(false)
                  setSelectedEvent(null)
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Sign-In Form Modal */}
        <Dialog open={showSignInForm} onOpenChange={setShowSignInForm}>
          <DialogContent className="max-w-md">
            {selectedEvent && (
              <VolunteerSignInForm
                eventId={selectedEvent.id}
                eventName={selectedEvent.name}
                onSubmit={handleSignInSubmit}
                onClose={() => {
                  setShowSignInForm(false)
                  setSelectedEvent(null)
                }}
                minHours={1}
                maxHours={8}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}

