"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/frontend/ui/tabs"
import { Separator } from "@/components/frontend/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { Progress } from "@/components/frontend/ui/progress"
import { 
    Calendar, 
    MapPin, 
    Clock, 
    Users, 
    DollarSign, 
    Phone, 
    Mail, 
    Globe, 
    Share2, 
    Heart, 
    ExternalLink,
    ArrowLeft,
    Star,
    CheckCircle,
    AlertCircle,
    Info,
    Building,
    FileText,
    User,
    Tag,
    Award,
    TrendingUp,
    Eye,
    Bookmark,
    MessageCircle,
    CalendarDays,
    MapPin as Location,
    Clock3,
    UserCheck,
    CreditCard,
    Shield,
    Zap,
    Sparkles
} from "lucide-react"
import { Link, Head } from "@inertiajs/react"
import { useState, useEffect } from "react"
import { showSuccessToast, showErrorToast } from '@/lib/toast'

interface Event {
    id: number;
    name: string;
    description: string;
    start_date: string;
    end_date?: string;
    location: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    poster_image?: string;
    status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
    max_participants?: number;
    registration_fee?: number;
    requirements?: string;
    contact_info?: string;
    organization?: {
        id: number;
        name: string;
        logo?: string;
        email?: string;
        phone?: string;
        website?: string;
        description?: string;
    };
    created_at: string;
    updated_at: string;
}

interface ViewEventProps {
    event: Event;
    auth?: any;
}

export default function ViewEvent({ event, auth }: ViewEventProps) {
    const [isFavorite, setIsFavorite] = useState(false)
    const [isRegistered, setIsRegistered] = useState(false)
    const [showShareMenu, setShowShareMenu] = useState(false)
    const [currentImageIndex, setCurrentImageIndex] = useState(0)

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'upcoming':
                return 'bg-blue-500 text-white'
            case 'ongoing':
                return 'bg-green-500 text-white'
            case 'completed':
                return 'bg-gray-500 text-white'
            case 'cancelled':
                return 'bg-red-500 text-white'
            default:
                return 'bg-gray-500 text-white'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'upcoming':
                return <Calendar className="h-4 w-4" />
            case 'ongoing':
                return <Zap className="h-4 w-4" />
            case 'completed':
                return <CheckCircle className="h-4 w-4" />
            case 'cancelled':
                return <AlertCircle className="h-4 w-4" />
            default:
                return <Info className="h-4 w-4" />
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
    }

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const getFullAddress = () => {
        const parts = [event.address, event.city, event.state, event.zip].filter(Boolean)
        return parts.length > 0 ? parts.join(', ') : event.location
    }

    const handleShare = async (platform: string) => {
        const url = window.location.href
        const title = event.name
        const text = event.description.substring(0, 100) + '...'

        switch (platform) {
            case 'twitter':
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`)
                break
            case 'facebook':
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)
                break
            case 'linkedin':
                window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`)
                break
            case 'whatsapp':
                window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`)
                break
            case 'email':
                window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text + '\n\n' + url)}`)
                break
            case 'copy':
                await navigator.clipboard.writeText(url)
                showSuccessToast('Link copied to clipboard!')
                break
        }
        setShowShareMenu(false)
    }

    const handleRegister = () => {
        if (event.registration_fee && event.registration_fee > 0) {
            // Redirect to payment page or show payment modal
            showSuccessToast('Redirecting to registration...')
        } else {
            setIsRegistered(true)
            showSuccessToast('Successfully registered for the event!')
        }
    }

    const toggleFavorite = () => {
        setIsFavorite(!isFavorite)
        showSuccessToast(isFavorite ? 'Removed from favorites' : 'Added to favorites')
    }

    const getDaysUntilEvent = () => {
        const now = new Date()
        const eventDate = new Date(event.start_date)
        const diffTime = eventDate.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays
    }

    const daysUntilEvent = getDaysUntilEvent()

    return (
        <FrontendLayout>
            <Head title={event.name} />
            
            {/* Hero Section */}
            <div className="relative min-h-[60vh] bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>
                
                <div className="relative z-10 container mx-auto px-4 py-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center text-white"
                    >
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <Badge className={`${getStatusColor(event.status)} border-0`}>
                                {getStatusIcon(event.status)}
                                <span className="ml-2 capitalize">{event.status}</span>
                            </Badge>
                        </div>
                        
                        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                            {event.name}
                        </h1>
                        
                        <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
                            {event.description?.substring(0, 150) || 'No description available'}...
                        </p>
                        
                        <div className="flex flex-wrap items-center justify-center gap-6 mb-8">
                            <div className="flex items-center gap-2 text-blue-100">
                                <Calendar className="h-5 w-5" />
                                <span>{formatDate(event.start_date)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-blue-100">
                                <Clock className="h-5 w-5" />
                                <span>{formatTime(event.start_date)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-blue-100">
                                <MapPin className="h-5 w-5" />
                                <span>{event.location}</span>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-center gap-4">
                            {/* <Button 
                                size="lg" 
                                className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8 py-3"
                                onClick={handleRegister}
                                disabled={isRegistered || event.status === 'cancelled'}
                            >
                                {isRegistered ? (
                                    <>
                                        <CheckCircle className="h-5 w-5 mr-2" />
                                        Registered
                                    </>
                                ) : event.status === 'cancelled' ? (
                                    'Event Cancelled'
                                ) : (
                                    <>
                                        <UserCheck className="h-5 w-5 mr-2" />
                                        Register Now
                                    </>
                                )}
                            </Button> */}
                            
                            {/* <Button 
                                variant="outline" 
                                size="lg"
                                className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3"
                                onClick={toggleFavorite}
                            >
                                <Heart className={`h-5 w-5 mr-2 ${isFavorite ? 'fill-current' : ''}`} />
                                {isFavorite ? 'Favorited' : 'Favorite'}
                            </Button>
                            
                            <Button 
                                variant="outline" 
                                size="lg"
                                className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3"
                                onClick={() => setShowShareMenu(!showShareMenu)}
                            >
                                <Share2 className="h-5 w-5 mr-2" />
                                Share
                            </Button> */}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Share Menu */}
            {/* {showShareMenu && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-20 right-4 z-50 bg-white rounded-lg shadow-xl border p-4"
                >
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleShare('twitter')}>
                            Twitter
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleShare('facebook')}>
                            Facebook
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleShare('linkedin')}>
                            LinkedIn
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleShare('whatsapp')}>
                            WhatsApp
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleShare('email')}>
                            Email
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleShare('copy')}>
                            Copy Link
                        </Button>
                    </div>
                </motion.div>
            )} */}

            {/* Main Content */}
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Event Poster */}
                        {event.poster_image && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <Card className="overflow-hidden shadow-lg">
                                    <img 
                                        src={`/storage/${event.poster_image}`} 
                                        alt={event.name}
                                        className="w-full h-96 object-cover"
                                    />
                                </Card>
                            </motion.div>
                        )}

                        {/* Event Details Tabs */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <Tabs defaultValue="about" className="w-full">
                                <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger value="about">About</TabsTrigger>
                                    <TabsTrigger value="details">Details</TabsTrigger>
                                    <TabsTrigger value="requirements">Requirements</TabsTrigger>
                                    <TabsTrigger value="contact">Contact</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="about" className="mt-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Sparkles className="h-5 w-5 text-blue-600" />
                                                About This Event
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="prose prose-lg max-w-none">
                                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                                    {event.description}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                                
                                <TabsContent value="details" className="mt-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Info className="h-5 w-5 text-blue-600" />
                                                Event Details
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                    <Calendar className="h-6 w-6 text-blue-600 mt-1" />
                                                    <div>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Start Date & Time</p>
                                                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                            {formatDateTime(event.start_date)}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                {event.end_date && (
                                                    <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                        <Clock3 className="h-6 w-6 text-blue-600 mt-1" />
                                                        <div>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">End Date & Time</p>
                                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                                {formatDateTime(event.end_date!)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                <Location className="h-6 w-6 text-blue-600 mt-1" />
                                                <div>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Location</p>
                                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                        {getFullAddress()}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {event.max_participants && (
                                                    <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                        <Users className="h-6 w-6 text-blue-600 mt-1" />
                                                        <div>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Maximum Participants</p>
                                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                                {event.max_participants} people
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                    <CreditCard className="h-6 w-6 text-blue-600 mt-1" />
                                                    <div>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Registration Fee</p>
                                                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                            {event.registration_fee ? `$${event.registration_fee}` : 'Free'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                                
                                <TabsContent value="requirements" className="mt-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <FileText className="h-5 w-5 text-blue-600" />
                                                Requirements
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {event.requirements ? (
                                                <div className="prose prose-lg max-w-none">
                                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                        {event.requirements}
                                                    </p>
                                                </div>
                                            ) : (
                                                <p className="text-gray-500 dark:text-gray-400 italic">
                                                    No specific requirements for this event.
                                                </p>
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                                
                                <TabsContent value="contact" className="mt-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Phone className="h-5 w-5 text-blue-600" />
                                                Contact Information
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {event.contact_info ? (
                                                <div className="prose prose-lg max-w-none">
                                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                        {event.contact_info}
                                                    </p>
                                                </div>
                                            ) : (
                                                <p className="text-gray-500 dark:text-gray-400 italic">
                                                    Contact information will be provided after registration.
                                                </p>
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </Tabs>
                        </motion.div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Countdown Timer */}
                        {daysUntilEvent > 0 && event.status === 'upcoming' && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Clock className="h-5 w-5" />
                                            Event Countdown
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-center">
                                            <div className="text-3xl font-bold mb-2">{daysUntilEvent}</div>
                                            <div className="text-sm opacity-90">
                                                {daysUntilEvent === 1 ? 'Day' : 'Days'} until event
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {/* Organization Info */}
                        {event.organization && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Building className="h-5 w-5 text-blue-600" />
                                            Organizing Organization
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-12 w-12">
                                                <AvatarImage src={event.organization?.logo} />
                                                <AvatarFallback>
                                                    {event.organization?.name?.charAt(0).toUpperCase() || 'O'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-white">
                                                    {event.organization?.name}
                                                </p>
                                                {event.organization?.description && (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        {event.organization?.description?.substring(0, 100)}...
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <Separator />
                                        
                                        <div className="space-y-3">
                                            {event.organization?.email && (
                                                <div className="flex items-center gap-3">
                                                    <Mail className="h-4 w-4 text-gray-500" />
                                                    <a 
                                                        href={`mailto:${event.organization?.email}`}
                                                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                                    >
                                                        {event.organization?.email}
                                                    </a>
                                                </div>
                                            )}
                                            
                                            {event.organization?.phone && (
                                                <div className="flex items-center gap-3">
                                                    <Phone className="h-4 w-4 text-gray-500" />
                                                    <a 
                                                        href={`tel:${event.organization?.phone}`}
                                                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                                    >
                                                        {event.organization?.phone}
                                                    </a>
                                                </div>
                                            )}
                                            
                                            {event.organization?.website && (
                                                <div className="flex items-center gap-3">
                                                    <Globe className="h-4 w-4 text-gray-500" />
                                                    <a 
                                                        href={event.organization?.website}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                                                    >
                                                        Visit Website
                                                        <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {/* Quick Stats */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 }}
                        >
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-blue-600" />
                                        Event Statistics
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 dark:text-gray-400">Status</span>
                                        <Badge className={getStatusColor(event.status)}>
                                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                                        </Badge>
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 dark:text-gray-400">Registration</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                            {event.registration_fee ? `$${event.registration_fee}` : 'Free'}
                                        </span>
                                    </div>
                                    
                                    {event.max_participants && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500 dark:text-gray-400">Capacity</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {event.max_participants} people
                                            </span>
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 dark:text-gray-400">Event ID</span>
                                        <span className="font-mono text-sm text-gray-900 dark:text-white">
                                            #{event.id}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Quick Actions */}
                        {/* <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.7 }}
                        >
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Zap className="h-5 w-5 text-blue-600" />
                                        Quick Actions
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Button 
                                        className="w-full bg-blue-600 hover:bg-blue-700"
                                        onClick={handleRegister}
                                        disabled={isRegistered || event.status === 'cancelled'}
                                    >
                                        {isRegistered ? (
                                            <>
                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                Already Registered
                                            </>
                                        ) : (
                                            <>
                                                <UserCheck className="h-4 w-4 mr-2" />
                                                Register Now
                                            </>
                                        )}
                                    </Button>
                                    
                                    <Button 
                                        variant="outline" 
                                        className="w-full"
                                        onClick={toggleFavorite}
                                    >
                                        <Heart className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-current' : ''}`} />
                                        {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                                    </Button>
                                    
                                    <Button 
                                        variant="outline" 
                                        className="w-full"
                                        onClick={() => setShowShareMenu(!showShareMenu)}
                                    >
                                        <Share2 className="h-4 w-4 mr-2" />
                                        Share Event
                                    </Button>
                                    
                                    <Button 
                                        variant="outline" 
                                        className="w-full"
                                    >
                                        <CalendarDays className="h-4 w-4 mr-2" />
                                        Add to Calendar
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div> */}
                    </div>
                </div>
            </div>
        </FrontendLayout>
    )
}
