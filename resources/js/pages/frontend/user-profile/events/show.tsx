"use client"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { motion } from "framer-motion"
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  DollarSign,
  ArrowLeft,
  Edit,
  Trash2,
  Eye,
  Globe,
  Lock,
} from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Link, router, usePage } from "@inertiajs/react"
import { toast } from "sonner"

interface Event {
  id: number
  name: string
  description: string
  start_date: string
  end_date?: string
  location: string
  address?: string
  city?: string
  state?: string
  zip?: string
  poster_image?: string
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
  max_participants?: number
  registration_fee?: number
  requirements?: string
  contact_info?: string
  visibility: 'public' | 'private'
  created_at: string
  updated_at: string
  user?: {
    id: number
    name: string
    email: string
    image?: string
  }
  organization?: {
    id: number
    name: string
    logo?: string
  }
  event_type?: {
    id: number
    name: string
    category: string
  }
}

interface PageProps {
  auth: {
    user: {
      id: number
      name: string
      email: string
    }
  }
  event: Event
}

export default function EventShow() {
  const { auth, event } = usePage<PageProps>().props

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case 'ongoing': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFullAddress = () => {
    const parts = [event.address, event.city, event.state, event.zip].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : event.location
  }

  const handleDeleteEvent = () => {
    if (confirm('Are you sure you want to delete this event?')) {
      router.delete(`/profile/events/${event.id}`, {
        onSuccess: () => {
          toast.success('Event deleted successfully!')
          router.visit('/profile/events')
        },
        onError: () => {
          toast.error('Failed to delete event')
        }
      })
    }
  }

  return (
    <ProfileLayout title={event.name} description="Event details">
      <div className="mx-auto space-y-6">
        {/* Back Button */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.visit('/profile/events')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Events
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Poster */}
            {event.poster_image && (
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-0">
                  <img
                    src={`/storage/${event.poster_image}`}
                    alt={event.name}
                    className="w-full h-64 sm:h-80 object-cover rounded-t-lg"
                  />
                </CardContent>
              </Card>
            )}

            {/* Event Description */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle>About This Event</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </p>
              </CardContent>
            </Card>

            {/* Event Details */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Start Date</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(event.start_date)}
                      </p>
                    </div>
                  </div>

                  {event.end_date && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">End Date</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(event.end_date)}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Location</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatFullAddress()}
                      </p>
                    </div>
                  </div>

                  {event.max_participants && (
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Max Participants</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {event.max_participants} people
                        </p>
                      </div>
                    </div>
                  )}

                  {event.registration_fee && (
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Registration Fee</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          ${event.registration_fee}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {event.requirements && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Requirements</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {event.requirements}
                    </p>
                  </div>
                )}

                {event.contact_info && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Contact Information</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {event.contact_info}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Event Status & Actions */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg">Event Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(event.status)}>
                    {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                  </Badge>
                  <Badge className={event.visibility === 'public' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'}>
                    {event.visibility === 'public' ? (
                      <>
                        <Globe className="w-3 h-3 mr-1" />
                        Public
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3 mr-1" />
                        Private
                      </>
                    )}
                  </Badge>
                </div>

                {event.event_type && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Event Type</p>
                    <p className="text-gray-900 dark:text-white">{event.event_type.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">{event.event_type.category}</p>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex flex-col gap-2">
                    <Link href={`/profile/events/${event.id}/edit`}>
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Event
                      </Button>
                    </Link>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteEvent}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Event
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Event Creator */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg">Event Creator</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {event.user?.name?.charAt(0) || event.organization?.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {event.user?.name || event.organization?.name || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {event.user ? 'Individual User' : 'Organization'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Event Stats */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg">Event Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Created</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {new Date(event.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Last Updated</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {new Date(event.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProfileLayout>
  )
}


