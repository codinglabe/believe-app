"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Calendar, MapPin, Clock, Users, ExternalLink } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { router } from "@inertiajs/react"
import { Head } from "@inertiajs/react"
import { format } from "date-fns"
import OrganizationProfileLayout from "@/components/frontend/organization/OrganizationProfileLayout"

interface Event {
  id: number
  title: string
  description: string
  start_date: string
  end_date?: string
  start_time?: string
  end_time?: string
  location?: string
  capacity?: number
  eventType?: {
    name: string
  }
  organization?: {
    name: string
  }
}

interface Props {
  organization: any
  auth: any
  events: {
    data: Event[]
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export default function OrganizationEvents({ organization, auth, events }: Props) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <FrontendLayout>
      <Head title={`${organization.name} - Events`} />
      <OrganizationProfileLayout organization={organization} auth={auth}>
        {/* Events Grid */}
        <div>
          {events.data.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="inline-flex p-6 bg-gray-100 dark:bg-gray-800 rounded-full mb-6">
                <Calendar className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                No Events Scheduled
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                This organization hasn't scheduled any events yet.
              </p>
            </motion.div>
          ) : (
            <>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {events.data.map((event) => (
                  <motion.div key={event.id} variants={itemVariants}>
                    <Card className="hover:shadow-2xl transition-all duration-300 border-0 shadow-lg bg-white dark:bg-gray-800 group overflow-hidden">
                      <div className="relative h-48 bg-gradient-to-br from-purple-500 to-pink-500">
                        <div className="absolute inset-0 bg-black/20"></div>
                        <div className="absolute top-4 left-4">
                          {event.eventType && (
                            <Badge className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
                              {event.eventType.name}
                            </Badge>
                          )}
                        </div>
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="text-white">
                            <div className="text-3xl font-bold">
                              {format(new Date(event.start_date), 'd')}
                            </div>
                            <div className="text-sm opacity-90">
                              {format(new Date(event.start_date), 'MMM yyyy')}
                            </div>
                          </div>
                        </div>
                      </div>

                      <CardHeader>
                        <CardTitle className="line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {event.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {event.description}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        {event.start_time && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Clock className="h-4 w-4" />
                            <span>{event.start_time}{event.end_time ? ` - ${event.end_time}` : ''}</span>
                          </div>
                        )}
                        {event.location && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <MapPin className="h-4 w-4" />
                            <span className="line-clamp-1">{event.location}</span>
                          </div>
                        )}
                        {event.capacity && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Users className="h-4 w-4" />
                            <span>Capacity: {event.capacity}</span>
                          </div>
                        )}
                      </CardContent>

                      <CardFooter>
                        <Button
                          className="w-full group/btn"
                          onClick={() => router.visit(route('events.show', event.id))}
                        >
                          View Details
                          <ExternalLink className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              {/* Pagination */}
              {events.last_page > 1 && (
                <div className="mt-12 flex justify-center gap-2">
                  {Array.from({ length: events.last_page }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={events.current_page === page ? "default" : "outline"}
                      onClick={() => router.get(route('organizations.events', organization.id), { page })}
                      className="min-w-[40px]"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </OrganizationProfileLayout>
    </FrontendLayout>
  )
}

