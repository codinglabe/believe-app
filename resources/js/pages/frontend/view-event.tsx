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
import { Link } from "@inertiajs/react"
import { PageHead } from "@/components/frontend/PageHead"
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

    const metaDescription = event.description ? String(event.description).slice(0, 160) : undefined;

    return (
        <FrontendLayout>
            <PageHead title={event.name} description={metaDescription} />
            
            {/* Hero Section */}
            <div className="relative min-h-[50vh] bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 overflow-hidden">
                {/* Background Elements */}
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="absolute inset-0 opacity-20">
                    <div className="w-full h-full" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                        backgroundRepeat: 'repeat'
                    }}></div>
                </div>
                
                {/* Floating Elements */}
                <div className="absolute top-20 left-10 w-32 h-32 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute top-40 right-20 w-24 h-24 bg-blue-300/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
                <div className="absolute bottom-20 left-1/4 w-20 h-20 bg-purple-300/10 rounded-full blur-xl animate-pulse delay-2000"></div>
                
                <div className="relative z-10 container mx-auto px-4 py-12">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="text-center text-white"
                    >
                        {/* Back Button */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="flex justify-start mb-8"
                        >
                            <Link
                                href="/events"
                                className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors group"
                            >
                                <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                                <span className="font-medium">Back to Events</span>
                            </Link>
                        </motion.div>

                        {/* Status Badge */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="flex items-center justify-center gap-2 mb-6"
                        >
                            <Badge className={`${getStatusColor(event.status)} border-0 px-4 py-2 text-sm font-semibold`}>
                                {getStatusIcon(event.status)}
                                <span className="ml-2 capitalize">{event.status}</span>
                            </Badge>
                        </motion.div>
                        
                        {/* Event Title */}
                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                            className="text-4xl md:text-6xl font-bold mb-4 leading-tight"
                        >
                            {event.name}
                        </motion.h1>
                        
                        {/* Event Description */}
                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.5 }}
                            className="text-lg md:text-xl text-blue-100 mb-8 max-w-4xl mx-auto leading-relaxed"
                        >
                            {event.description?.substring(0, 150) || 'No description available'}...
                        </motion.p>
                        
                        {/* Event Info Cards */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.6 }}
                            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
                        >
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <Calendar className="h-5 w-5 text-white" />
                                    </div>
                                    <h3 className="text-base font-semibold text-white">Date & Time</h3>
                            </div>
                                <p className="text-blue-100 text-sm">{formatDate(event.start_date)}</p>
                                <p className="text-blue-200 text-sm">{formatTime(event.start_date)}</p>
                            </div>
                            
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <MapPin className="h-5 w-5 text-white" />
                            </div>
                                    <h3 className="text-base font-semibold text-white">Location</h3>
                        </div>
                                <p className="text-blue-100 text-sm">{event.location}</p>
                                {event.city && event.state && (
                                    <p className="text-blue-200 text-sm">{event.city}, {event.state}</p>
                                )}
                            </div>
                            
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <DollarSign className="h-5 w-5 text-white" />
                                    </div>
                                    <h3 className="text-base font-semibold text-white">Registration</h3>
                                </div>
                                <p className="text-blue-100 text-sm">
                                    {event.registration_fee ? `$${event.registration_fee}` : 'Free Event'}
                                </p>
                                {event.max_participants && (
                                    <p className="text-blue-200 text-sm">Max {event.max_participants} participants</p>
                                )}
                            </div>
                        </motion.div>

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
            <div className="container mx-auto px-4 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-10">
                        {/* Event Poster */}
                        {event.poster_image && (
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.8 }}
                            >
                                <Card className="overflow-hidden shadow-2xl border-0 rounded-3xl group">
                                    <div className="relative overflow-hidden">
                                    <img 
                                        src={`/storage/${event.poster_image}`} 
                                        alt={event.name}
                                            className="w-full h-[500px] object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {/* Event Details Tabs */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.8 }}
                        >
                            <Tabs defaultValue="about" className="w-full">
                                <TabsList className="grid w-full grid-cols-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                                    <TabsTrigger 
                                        value="about" 
                                        className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-md font-medium transition-all duration-200 py-2 px-3"
                                    >
                                        About
                                    </TabsTrigger>
                                    <TabsTrigger 
                                        value="details"
                                        className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-md font-medium transition-all duration-200 py-2 px-3"
                                    >
                                        Details
                                    </TabsTrigger>
                                    <TabsTrigger 
                                        value="requirements"
                                        className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-md font-medium transition-all duration-200 py-2 px-3"
                                    >
                                        Requirements
                                    </TabsTrigger>
                                    <TabsTrigger 
                                        value="contact"
                                        className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-md font-medium transition-all duration-200 py-2 px-3"
                                    >
                                        Contact
                                    </TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="about" className="mt-6">
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5 }}
                                    >
                                        <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
                                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-8">
                                            <CardTitle className="flex items-center gap-3 text-2xl">
                                                <div className="p-3 bg-blue-600 rounded-2xl">
                                                    <Sparkles className="h-6 w-6 text-white" />
                                                </div>
                                                About This Event
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-8">
                                            <div className="prose prose-lg max-w-none">
                                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-lg">
                                                    {event.description}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    </motion.div>
                                </TabsContent>
                                
                                <TabsContent value="details" className="mt-6">
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5 }}
                                    >
                                        <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
                                        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-8">
                                            <CardTitle className="flex items-center gap-3 text-2xl">
                                                <div className="p-3 bg-green-600 rounded-2xl">
                                                    <Info className="h-6 w-6 text-white" />
                                                </div>
                                                Event Details
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-8 space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="group flex items-start gap-4 p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl border border-blue-200 dark:border-blue-700 hover:shadow-lg transition-all duration-300">
                                                    <div className="p-3 bg-blue-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                                        <Calendar className="h-6 w-6 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-1">Start Date & Time</p>
                                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                                            {formatDateTime(event.start_date)}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                {event.end_date && (
                                                    <div className="group flex items-start gap-4 p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl border border-purple-200 dark:border-purple-700 hover:shadow-lg transition-all duration-300">
                                                        <div className="p-3 bg-purple-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                                            <Clock3 className="h-6 w-6 text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-purple-600 dark:text-purple-400 font-semibold mb-1">End Date & Time</p>
                                                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                                                {formatDateTime(event.end_date!)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="group flex items-start gap-4 p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-2xl border border-orange-200 dark:border-orange-700 hover:shadow-lg transition-all duration-300">
                                                <div className="p-3 bg-orange-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                                    <Location className="h-6 w-6 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-orange-600 dark:text-orange-400 font-semibold mb-1">Location</p>
                                                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                                                        {getFullAddress()}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {event.max_participants && (
                                                    <div className="group flex items-start gap-4 p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-2xl border border-emerald-200 dark:border-emerald-700 hover:shadow-lg transition-all duration-300">
                                                        <div className="p-3 bg-emerald-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                                            <Users className="h-6 w-6 text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold mb-1">Maximum Participants</p>
                                                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                                                {event.max_participants} people
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                <div className="group flex items-start gap-4 p-6 bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-800/20 rounded-2xl border border-rose-200 dark:border-rose-700 hover:shadow-lg transition-all duration-300">
                                                    <div className="p-3 bg-rose-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                                        <CreditCard className="h-6 w-6 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-rose-600 dark:text-rose-400 font-semibold mb-1">Registration Fee</p>
                                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                                            {event.registration_fee ? `$${event.registration_fee}` : 'Free'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    </motion.div>
                                </TabsContent>
                                
                                <TabsContent value="requirements" className="mt-6">
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5 }}
                                    >
                                        <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
                                        <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 p-8">
                                            <CardTitle className="flex items-center gap-3 text-2xl">
                                                <div className="p-3 bg-amber-600 rounded-2xl">
                                                    <FileText className="h-6 w-6 text-white" />
                                                </div>
                                                Requirements
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-8">
                                            {event.requirements ? (
                                                <div className="prose prose-lg max-w-none">
                                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-lg leading-relaxed">
                                                        {event.requirements}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="text-center py-12">
                                                    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl w-fit mx-auto mb-4">
                                                        <FileText className="h-8 w-8 text-gray-400" />
                                                    </div>
                                                    <p className="text-gray-500 dark:text-gray-400 text-lg italic">
                                                    No specific requirements for this event.
                                                </p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                    </motion.div>
                                </TabsContent>
                                
                                <TabsContent value="contact" className="mt-6">
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5 }}
                                    >
                                        <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
                                        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-8">
                                            <CardTitle className="flex items-center gap-3 text-2xl">
                                                <div className="p-3 bg-indigo-600 rounded-2xl">
                                                    <Phone className="h-6 w-6 text-white" />
                                                </div>
                                                Contact Information
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-8">
                                            {event.contact_info ? (
                                                <div className="prose prose-lg max-w-none">
                                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-lg leading-relaxed">
                                                        {event.contact_info}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="text-center py-12">
                                                    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl w-fit mx-auto mb-4">
                                                        <Phone className="h-8 w-8 text-gray-400" />
                                                    </div>
                                                    <p className="text-gray-500 dark:text-gray-400 text-lg italic">
                                                    Contact information will be provided after registration.
                                                </p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                    </motion.div>
                                </TabsContent>
                            </Tabs>
                        </motion.div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-8">
                        {/* Countdown Timer */}
                        {daysUntilEvent > 0 && event.status === 'upcoming' && (
                            <motion.div
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4, duration: 0.8 }}
                            >
                                <Card className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 text-white border-0 shadow-2xl rounded-3xl overflow-hidden">
                                    <CardHeader className="p-6">
                                        <CardTitle className="flex items-center gap-3 text-xl">
                                            <div className="p-2 bg-white/20 rounded-xl">
                                                <Clock className="h-6 w-6" />
                                            </div>
                                            Event Countdown
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 pt-0">
                                        <div className="text-center">
                                            <div className="text-5xl font-bold mb-3 bg-gradient-to-r from-white to-yellow-200 bg-clip-text text-transparent">
                                                {daysUntilEvent}
                                            </div>
                                            <div className="text-lg opacity-90 font-medium">
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
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5, duration: 0.8 }}
                            >
                                <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
                                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6">
                                        <CardTitle className="flex items-center gap-3 text-xl">
                                            <div className="p-2 bg-blue-600 rounded-xl">
                                                <Building className="h-6 w-6 text-white" />
                                            </div>
                                            Organizing Organization
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-6">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                                                <AvatarImage src={event.organization?.logo} />
                                                <AvatarFallback className="bg-blue-600 text-white text-xl font-bold">
                                                    {event.organization?.name?.charAt(0).toUpperCase() || 'O'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white text-lg">
                                                    {event.organization?.name}
                                                </p>
                                                {event.organization?.description && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                        {event.organization?.description?.substring(0, 100)}...
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <Separator className="bg-gray-200 dark:bg-gray-700" />
                                        
                                        <div className="space-y-4">
                                            {event.organization?.email && (
                                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                                        <Mail className="h-4 w-4 text-blue-600" />
                                                    </div>
                                                    <a 
                                                        href={`mailto:${event.organization?.email}`}
                                                        className="text-blue-600 hover:text-blue-700 text-sm font-medium flex-1"
                                                    >
                                                        {event.organization?.email}
                                                    </a>
                                                </div>
                                            )}
                                            
                                            {event.organization?.phone && (
                                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                                                        <Phone className="h-4 w-4 text-green-600" />
                                                    </div>
                                                    <a 
                                                        href={`tel:${event.organization?.phone}`}
                                                        className="text-green-600 hover:text-green-700 text-sm font-medium flex-1"
                                                    >
                                                        {event.organization?.phone}
                                                    </a>
                                                </div>
                                            )}
                                            
                                            {event.organization?.website && (
                                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                                                        <Globe className="h-4 w-4 text-purple-600" />
                                                    </div>
                                                    <a 
                                                        href={event.organization?.website}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1 flex-1"
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
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6, duration: 0.8 }}
                        >
                            <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
                                <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-6">
                                    <CardTitle className="flex items-center gap-3 text-xl">
                                        <div className="p-2 bg-emerald-600 rounded-xl">
                                            <TrendingUp className="h-6 w-6 text-white" />
                                        </div>
                                        Event Statistics
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                        <span className="text-gray-600 dark:text-gray-400 font-medium">Status</span>
                                        <Badge className={`${getStatusColor(event.status)} px-3 py-1 font-semibold`}>
                                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                                        </Badge>
                                    </div>
                                    
                                    <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                        <span className="text-gray-600 dark:text-gray-400 font-medium">Registration</span>
                                        <span className="font-bold text-gray-900 dark:text-white text-lg">
                                            {event.registration_fee ? `$${event.registration_fee}` : 'Free'}
                                        </span>
                                    </div>
                                    
                                    {event.max_participants && (
                                        <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                            <span className="text-gray-600 dark:text-gray-400 font-medium">Capacity</span>
                                            <span className="font-bold text-gray-900 dark:text-white text-lg">
                                                {event.max_participants} people
                                            </span>
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                        <span className="text-gray-600 dark:text-gray-400 font-medium">Event ID</span>
                                        <span className="font-mono text-sm text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
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
