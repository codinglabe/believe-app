"use client"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  MoreVertical,
} from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Badge } from "@/components/frontend/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/frontend/ui/dropdown-menu"
import { Link, router, usePage } from "@inertiajs/react"
import { toast } from "sonner"
import { PermissionGuard, PermissionButton } from "@/components/ui/permission-guard"
import { useEventPermissions } from "@/lib/permission-utils"

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
  events: {
    data: Event[]
    current_page: number
    last_page: number
    per_page: number
    total: number
    links: any[]
  }
  eventTypes: Array<{
    id: number
    name: string
    category: string
    description?: string
  }>
  filters: {
    search: string
    status: string
  }
  [key: string]: any
}

export default function EventsIndex() {
  const { auth, events, eventTypes, filters } = usePage<PageProps>().props
  const [searchQuery, setSearchQuery] = useState(filters.search || "")
  const [statusFilter, setStatusFilter] = useState(filters.status || "all")
  const [isSearching, setIsSearching] = useState(false)
  const eventPermissions = useEventPermissions()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case 'ongoing': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  const getVisibilityColor = (visibility: string) => {
    return visibility === 'public' 
      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      : 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const [deleteEventId, setDeleteEventId] = useState<number | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const handleDeleteEvent = (eventId: number) => {
    setDeleteEventId(eventId)
    setShowDeleteModal(true)
  }

  const confirmDelete = () => {
    if (deleteEventId) {
      router.delete(`/profile/events/${deleteEventId}`, {
        onSuccess: () => {
          toast.success('Event deleted successfully!')
          setShowDeleteModal(false)
          setDeleteEventId(null)
        },
        onError: () => {
          toast.error('Failed to delete event')
        }
      })
    }
  }

  // Debounced search to avoid too many API calls
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout
      return (query: string) => {
        clearTimeout(timeoutId)
        setIsSearching(true)
        timeoutId = setTimeout(() => {
          router.get('/profile/events', { 
            search: query, 
            status: statusFilter 
          }, { 
            preserveState: true,
            replace: true,
            onFinish: () => setIsSearching(false)
          })
        }, 500) // 500ms delay
      }
    })(),
    [statusFilter]
  )

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    debouncedSearch(query)
  }

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status)
    setIsSearching(true)
    router.get('/profile/events', { 
      search: searchQuery, 
      status: status 
    }, { 
      preserveState: true,
      replace: true,
      onFinish: () => setIsSearching(false)
    })
  }

  return (
    <ProfileLayout title="My Events" description="Manage your created events">
      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">My Events</h1>
              <p className="text-gray-600 dark:text-gray-300">Manage and organize your created events</p>
            </div>
                         <PermissionButton
               permission="event.create"
               onClick={() => router.visit('/profile/events/create')}
               className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
             >
               <Plus className="w-5 h-5 mr-2" />
               Create New Event
             </PermissionButton>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-12 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Events Grid */}
        {events.data.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.data.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                          {event.name}
                        </CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {event.description}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                                                 <DropdownMenuContent align="end">
                           <PermissionGuard permission="event.read">
                             <DropdownMenuItem asChild>
                               <Link href={`/profile/events/${event.id}`}>
                                 <Eye className="w-4 h-4 mr-2" />
                                 View
                               </Link>
                             </DropdownMenuItem>
                           </PermissionGuard>
                           <PermissionGuard permission="event.edit">
                             <DropdownMenuItem asChild>
                               <Link href={`/profile/events/${event.id}/edit`}>
                                 <Edit className="w-4 h-4 mr-2" />
                                 Edit
                               </Link>
                             </DropdownMenuItem>
                           </PermissionGuard>
                           <PermissionGuard permission="event.delete">
                             <DropdownMenuItem 
                               onClick={() => handleDeleteEvent(event.id)}
                               className="text-red-600 dark:text-red-400"
                             >
                               <Trash2 className="w-4 h-4 mr-2" />
                               Delete
                             </DropdownMenuItem>
                           </PermissionGuard>
                         </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Event Image */}
                    {event.poster_image && (
                      <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                        <img
                          src={`/storage/${event.poster_image}`}
                          alt={event.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Event Details */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(event.start_date)}</span>
                        {event.end_date && (
                          <>
                            <span>to</span>
                            <span>{formatDate(event.end_date)}</span>
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="w-4 h-4" />
                        <span className="line-clamp-1">{event.location}</span>
                      </div>

                      {event.max_participants && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Users className="w-4 h-4" />
                          <span>Max {event.max_participants} participants</span>
                        </div>
                      )}

                      {event.registration_fee && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <DollarSign className="w-4 h-4" />
                          <span>${event.registration_fee}</span>
                        </div>
                      )}
                    </div>

                    {/* Status and Visibility Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getStatusColor(event.status)}>
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </Badge>
                      <Badge className={getVisibilityColor(event.visibility)}>
                        {event.visibility.charAt(0).toUpperCase() + event.visibility.slice(1)}
                      </Badge>
                      {event.event_type && (
                        <Badge variant="outline" className="text-xs">
                          {event.event_type.name}
                        </Badge>
                      )}
                    </div>

                    {/* Event Type */}
                    {event.event_type && (
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Category: {event.event_type.category}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full p-6 mb-6">
                <Calendar className="w-16 h-16 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                No events found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-8 max-w-md text-lg">
                {filters.search || filters.status !== 'all' 
                  ? 'No events match your current filters. Try adjusting your search criteria.'
                  : 'You haven\'t created any events yet. Start by creating your first event!'
                }
              </p>
                             <PermissionButton
                 permission="event.create"
                 onClick={() => router.visit('/profile/events/create')}
                 className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 px-8 py-3"
               >
                 <Plus className="w-5 h-5 mr-2" />
                 Create Your First Event
               </PermissionButton>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {events.last_page > 1 && (
          <div className="flex items-center justify-center gap-2">
            {events.links.map((link, index) => (
              <Button
                key={index}
                variant={link.active ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (link.url) {
                    // Parse the URL and add current filters
                    const url = new URL(link.url, window.location.origin)
                    if (searchQuery) url.searchParams.set('search', searchQuery)
                    if (statusFilter !== 'all') url.searchParams.set('status', statusFilter)
                    router.get(url.pathname + url.search)
                  }
                }}
                disabled={!link.url}
                className="min-w-[40px]"
              >
                {link.label}
              </Button>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delete Event
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete this event? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeleteEventId(null)
                  }}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Event
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProfileLayout>
  )
}
