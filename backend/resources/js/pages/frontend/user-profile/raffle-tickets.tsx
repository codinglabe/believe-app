"use client"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Button } from "@/components/frontend/ui/button"
import { usePage } from "@inertiajs/react"
import { 
  Award, 
  Calendar, 
  DollarSign, 
  Gift, 
  Trophy, 
  Clock, 
  CheckCircle,
  Ticket,
  Crown,
  Medal,
  Download,
  Eye
} from "lucide-react"
import { Link } from "@inertiajs/react"
import RaffleTicket from "@/components/ui/raffle-ticket"
import { downloadTicket, printTicket } from "@/lib/ticket-download"
import { useRef } from "react"

interface RaffleTicket {
  id: number
  ticket_number: string
  price: number
  purchased_at: string
  raffle: {
    id: number
    title: string
    description: string
    draw_date: string
    status: string
    image?: string
    organization: {
      name: string
    }
    winners: Array<{
      id: number
      position: number
      ticket: {
        ticket_number: string
      }
    }>
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
  raffleTickets: RaffleTicket[]
}

export default function RaffleTicketsPage() {
  const { auth, raffleTickets = [] } = usePage<PageProps>().props
  const ticketRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="w-4 h-4" />
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'cancelled': return <Award className="w-4 h-4" />
      default: return <Ticket className="w-4 h-4" />
    }
  }

  const getPrizeIcon = (position: number) => {
    switch (position) {
      case 1: return <Crown className="w-5 h-5 text-yellow-600" />
      case 2: return <Medal className="w-5 h-5 text-gray-500" />
      case 3: return <Trophy className="w-5 h-5 text-amber-600" />
      default: return <Award className="w-5 h-5 text-gray-500" />
    }
  }

  const isWinner = (ticket: RaffleTicket) => {
    return ticket.raffle.winners.some(winner => winner.ticket.ticket_number === ticket.ticket_number)
  }

  const getWinningPosition = (ticket: RaffleTicket) => {
    const winner = ticket.raffle.winners.find(winner => winner.ticket.ticket_number === ticket.ticket_number)
    return winner ? winner.position : null
  }

  return (
    <ProfileLayout title="My Raffle Tickets" description="View your purchased raffle tickets and check if you won!">
      <div className="space-y-6">
        {raffleTickets.length === 0 ? (
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Award className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Raffle Tickets Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                You haven't purchased any raffle tickets yet. Browse available raffles and try your luck!
              </p>
              <Link href="/frontend/raffles">
                <Button className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white">
                  Browse Raffles
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your Raffle Tickets</h2>
              <p className="text-gray-600 dark:text-gray-400">Beautiful tickets for your purchased raffles</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {raffleTickets.map((ticket) => (
                <div key={ticket.id} className="relative">
                  <div ref={(el) => { ticketRefs.current[ticket.id] = el; }} className="w-full">
                    <RaffleTicket 
                      ticket={{
                        ...ticket,
                        user: auth.user,
                        is_winner: isWinner(ticket)
                      }} 
                      showStub={true}
                      className="w-full"
                    />
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4 justify-center flex-wrap">
                    <Link href={`/frontend/raffles/${ticket.raffle.id}`}>
                      <Button variant="outline" size="sm" className="flex items-center bg-white hover:bg-gray-50 border-gray-300 text-gray-700">
                        <Eye className="w-4 h-4 mr-2" />
                        View Raffle
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const ticketElement = ticketRefs.current[ticket.id];
                        if (ticketElement) {
                          downloadTicket(ticketElement, ticket.ticket_number);
                        }
                      }}
                      className="flex items-center bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const ticketElement = ticketRefs.current[ticket.id];
                        if (ticketElement) {
                          printTicket(ticketElement);
                        }
                      }}
                      className="flex items-center bg-green-50 hover:bg-green-100 border-green-300 text-green-700"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Print
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ProfileLayout>
  )
}

