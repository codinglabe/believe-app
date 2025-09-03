"use client"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  DollarSign,
  Upload,
  Save,
  ArrowLeft,
  Image as ImageIcon,
  X,
} from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Textarea } from "@/components/frontend/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/frontend/ui/select"
import { Switch } from "@/components/frontend/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/frontend/ui/tabs"
import { router, usePage } from "@inertiajs/react"
import { toast } from "sonner"

interface EventType {
  id: number
  name: string
  category: string
  description?: string
}

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
  event_type_id?: number
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
  eventTypes: EventType[]
  [key: string]: any
}

export default function EditEvent() {
  const { auth, event, eventTypes } = usePage<PageProps>().props
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [currentTab, setCurrentTab] = useState('basic')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  
  const [formData, setFormData] = useState({
    name: event.name || '',
    description: event.description || '',
    start_date: event.start_date ? new Date(event.start_date).toISOString().slice(0, 16) : '',
    end_date: event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : '',
    location: event.location || '',
    address: event.address || '',
    city: event.city || '',
    state: event.state || '',
    zip: event.zip || '',
    event_type_id: event.event_type_id?.toString() || '',
    max_participants: event.max_participants?.toString() || '',
    registration_fee: event.registration_fee?.toString() || '',
    requirements: event.requirements || '',
    contact_info: event.contact_info || '',
    visibility: event.visibility || 'public',
    status: event.status || 'upcoming',
    poster_image: null as File | null,
  })

  useEffect(() => {
    if (event.poster_image) {
      setPreviewImage(`/storage/${event.poster_image}`)
    }
  }, [event.poster_image])

  const handleInputChange = (field: string, value: string | File | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const validateTab = (tab: string): boolean => {
    const newErrors: Record<string, string> = {}
    
    switch (tab) {
      case 'basic':
        if (!formData.name.trim()) newErrors.name = 'Event name is required'
        if (!formData.description.trim()) newErrors.description = 'Description is required'
        if (!formData.start_date) newErrors.start_date = 'Start date is required'
        if (!formData.event_type_id) newErrors.event_type_id = 'Event type is required'
        break
        
      case 'location':
        if (!formData.location.trim()) newErrors.location = 'Location is required'
        break
        
      case 'details':
        // Details tab has no required fields
        break
        
      case 'poster':
        // Poster tab has no required fields
        break
    }
    
    // Only update errors if they're different to prevent infinite re-renders
    const hasChanges = JSON.stringify(newErrors) !== JSON.stringify(errors)
    if (hasChanges) {
      setErrors(newErrors)
    }
    
    return Object.keys(newErrors).length === 0
  }

  const handleTabChange = (tab: string) => {
    if (validateTab(currentTab)) {
      setCurrentTab(tab)
    }
  }

  const canProceedToNextTab = (): boolean => {
    return validateTab(currentTab)
  }

  // Prevent accidental form submit when Next switches to final tab
  const goToNextTabSafely = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!canProceedToNextTab()) return
    const next = getNextTab()
    setTimeout(() => setCurrentTab(next), 0)
  }

  const getNextTab = (): string => {
    const tabs = ['basic', 'location', 'details', 'poster']
    const currentIndex = tabs.indexOf(currentTab)
    return currentIndex < tabs.length - 1 ? tabs[currentIndex + 1] : currentTab
  }

  const getPreviousTab = (): string => {
    const tabs = ['basic', 'location', 'details', 'poster']
    const currentIndex = tabs.indexOf(currentTab)
    return currentIndex > 0 ? tabs[currentIndex - 1] : currentTab
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({
        ...prev,
        poster_image: file
      }))
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      poster_image: null
    }))
    setPreviewImage(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate all tabs before submission
    if (!validateTab('basic') || !validateTab('location')) {
      toast.error('Please fill in all required fields before updating the event')
      return
    }
    
    // Additional validation for end date
    if (formData.end_date && new Date(formData.end_date) <= new Date(formData.start_date)) {
      setErrors(prev => ({ ...prev, end_date: 'End date must be after start date' }))
      toast.error('End date must be after start date')
      return
    }
    
    setIsSubmitting(true)

    const submitData = new FormData()
    
    // Add all form fields
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null && value !== '') {
        if (key === 'poster_image' && value instanceof File) {
          submitData.append(key, value)
        } else if (key !== 'poster_image') {
          submitData.append(key, value as string)
        }
      }
    })

    // Add _method for Laravel to recognize as PUT request
    submitData.append('_method', 'PUT')

    router.post(`/profile/events/${event.id}`, submitData, {
      onSuccess: () => {
        toast.success('Event updated successfully!')
        router.visit('/profile/events')
      },
      onError: (errors) => {
        console.error('Validation errors:', errors)
        setErrors(errors)
        toast.error('Please check the form for errors')
      },
      onFinish: () => {
        setIsSubmitting(false)
      }
    })
  }

  const groupedEventTypes = eventTypes.reduce((acc, eventType) => {
    if (!acc[eventType.category]) {
      acc[eventType.category] = []
    }
    acc[eventType.category].push(eventType)
    return acc
  }, {} as Record<string, EventType[]>)

  return (
    <ProfileLayout title="Edit Event" description="Update your event information">
      <div className="w-full space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Edit Event</h1>
              <p className="text-gray-600 dark:text-gray-300">Update your event information</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => router.visit('/profile/events')}
                className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => router.visit('/profile/events')}
                className="flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900/20"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Events
              </Button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              <TabsTrigger value="basic" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm">
                <Calendar className="w-4 h-4" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="location" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm">
                <MapPin className="w-4 h-4" />
                Location
              </TabsTrigger>
              <TabsTrigger value="details" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm">
                <Users className="w-4 h-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="poster" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm">
                <ImageIcon className="w-4 h-4" />
                Poster
              </TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-6">
              <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-200 dark:border-blue-800">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    Basic Information
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-300">
                    Provide the essential details about your event
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="name" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Event Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter event name"
                        required
                        className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 ${
                          errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                        }`}
                      />
                      {errors.name && (
                        <p className="text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                      )}
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="event_type_id" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Event Type *</Label>
                      <Select value={formData.event_type_id} onValueChange={(value) => handleInputChange('event_type_id', value)}>
                        <SelectTrigger className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 ${
                          errors.event_type_id ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                        }`}>
                          <SelectValue placeholder="Select event type" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(groupedEventTypes).map(([category, types]) => (
                            <div key={category}>
                              <div className="px-2 py-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400">
                                {category}
                              </div>
                              {types.map((type) => (
                                <SelectItem key={type.id} value={type.id.toString()}>
                                  {type.name}
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.event_type_id && (
                        <p className="text-sm text-red-600 dark:text-red-400">{errors.event_type_id}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="description" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Describe your event..."
                      rows={4}
                      required
                      className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 ${
                        errors.description ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                      }`}
                    />
                    {errors.description && (
                      <p className="text-sm text-red-600 dark:text-red-400">{errors.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="start_date" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Start Date & Time *</Label>
                      <Input
                        id="start_date"
                        type="datetime-local"
                        value={formData.start_date}
                        onChange={(e) => handleInputChange('start_date', e.target.value)}
                        required
                        className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 ${
                          errors.start_date ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                        }`}
                      />
                      {errors.start_date && (
                        <p className="text-sm text-red-600 dark:text-red-400">{errors.start_date}</p>
                      )}
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="end_date" className="text-sm font-semibold text-gray-700 dark:text-gray-300">End Date & Time</Label>
                      <Input
                        id="end_date"
                        type="datetime-local"
                        value={formData.end_date}
                        onChange={(e) => handleInputChange('end_date', e.target.value)}
                        className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 ${
                          errors.end_date ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                        }`}
                      />
                      {errors.end_date && (
                        <p className="text-sm text-red-600 dark:text-red-400">{errors.end_date}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Location Information Tab */}
            <TabsContent value="location" className="space-y-6">
              <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-b border-green-200 dark:border-green-800">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <MapPin className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    Location Information
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-300">
                    Where will your event take place?
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="location" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Location/Venue *</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="e.g., Community Center, Park Name, etc."
                      required
                      className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-green-500 focus:ring-green-500 ${
                        errors.location ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                      }`}
                    />
                    {errors.location && (
                      <p className="text-sm text-red-600 dark:text-red-400">{errors.location}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="address" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Address</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="Street address"
                        className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="city" className="text-sm font-semibold text-gray-700 dark:text-gray-300">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="City"
                        className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="state" className="text-sm font-semibold text-gray-700 dark:text-gray-300">State</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        placeholder="State"
                        className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="zip" className="text-sm font-semibold text-gray-700 dark:text-gray-300">ZIP Code</Label>
                      <Input
                        id="zip"
                        value={formData.zip}
                        onChange={(e) => handleInputChange('zip', e.target.value)}
                        placeholder="ZIP code"
                        className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Event Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-b border-purple-200 dark:border-purple-800">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    Event Details
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-300">
                    Additional information about your event
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="max_participants" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Maximum Participants</Label>
                      <Input
                        id="max_participants"
                        type="number"
                        value={formData.max_participants}
                        onChange={(e) => handleInputChange('max_participants', e.target.value)}
                        placeholder="Leave empty for unlimited"
                        min="1"
                        className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="registration_fee" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Registration Fee ($)</Label>
                      <Input
                        id="registration_fee"
                        type="number"
                        step="0.01"
                        value={formData.registration_fee}
                        onChange={(e) => handleInputChange('registration_fee', e.target.value)}
                        placeholder="0.00 for free events"
                        min="0"
                        className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="requirements" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Requirements</Label>
                    <Textarea
                      id="requirements"
                      value={formData.requirements}
                      onChange={(e) => handleInputChange('requirements', e.target.value)}
                      placeholder="Any special requirements or items participants should bring..."
                      rows={3}
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="contact_info" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Contact Information</Label>
                    <Textarea
                      id="contact_info"
                      value={formData.contact_info}
                      onChange={(e) => handleInputChange('contact_info', e.target.value)}
                      placeholder="How can people contact you for questions?"
                      rows={2}
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="visibility"
                      checked={formData.visibility === 'public'}
                      onCheckedChange={(checked) => handleInputChange('visibility', checked ? 'public' : 'private')}
                    />
                    <Label htmlFor="visibility">
                      Make this event public (visible to everyone)
                    </Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

                         {/* Event Poster Tab */}
             <TabsContent value="poster" className="space-y-6">
               <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
                 <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-b border-orange-200 dark:border-orange-800">
                   <CardTitle className="flex items-center gap-3 text-xl">
                     <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                       <ImageIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                     </div>
                     Event Poster
                   </CardTitle>
                   <CardDescription className="text-gray-600 dark:text-gray-300">
                     Upload an image to represent your event (optional)
                   </CardDescription>
                 </CardHeader>
                 <CardContent className="p-6 space-y-6">
                   {previewImage ? (
                     <div className="relative">
                       <img
                         src={previewImage}
                         alt="Event poster preview"
                         className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                       />
                       <Button
                         type="button"
                         variant="destructive"
                         size="sm"
                         onClick={removeImage}
                         className="absolute top-2 right-2"
                       >
                         <X className="w-4 h-4" />
                       </Button>
                     </div>
                   ) : (
                     <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                       <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                       <p className="text-gray-600 dark:text-gray-400 mb-2">
                         Upload an event poster
                       </p>
                       <p className="text-sm text-gray-500 dark:text-gray-500">
                         PNG, JPG up to 10MB
                       </p>
                     </div>
                   )}
                   
                   <Input
                     type="file"
                     accept="image/*"
                     onChange={handleImageUpload}
                     className="cursor-pointer bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white file:bg-blue-50 file:border-blue-200 file:text-blue-700 file:rounded-md file:px-4 file:py-2 file:mr-4 file:border-0 hover:file:bg-blue-100"
                   />
                 </CardContent>
               </Card>
             </TabsContent>
           </Tabs>

           {/* Tab Navigation */}
          <div className="flex justify-between items-center bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6 border border-gray-200 dark:border-gray-600">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentTab(getPreviousTab())}
              disabled={currentTab === 'basic'}
              className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Step {['basic', 'location', 'details', 'poster'].indexOf(currentTab) + 1} of 4
              </span>
            </div>
            
            {currentTab !== 'poster' ? (
              <Button
                type="button"
                onClick={goToNextTabSafely}
                disabled={!canProceedToNextTab()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting || !canProceedToNextTab()}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
                    Updating Event...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-3" />
                    Update Event
                  </>
                )}
              </Button>
            )}
                     </div>
         </form>

         {/* Delete Event Modal */}
         <div className="mt-8">
           <Card className="bg-white dark:bg-gray-800 border-red-200 dark:border-red-800">
             <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-b border-red-200 dark:border-red-800">
               <CardTitle className="flex items-center gap-3 text-xl text-red-700 dark:text-red-300">
                 <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                   <X className="w-6 h-6 text-red-600 dark:text-red-400" />
                 </div>
                 Delete Event
               </CardTitle>
               <CardDescription className="text-red-600 dark:text-red-400">
                 This action cannot be undone. This will permanently delete your event.
               </CardDescription>
             </CardHeader>
             <CardContent className="p-6">
               <div className="flex items-center justify-between">
                 <div className="text-sm text-gray-600 dark:text-gray-400">
                   <p>Event: <span className="font-semibold text-gray-900 dark:text-white">{event.name}</span></p>
                   <p>This will remove the event from your profile and delete all associated data.</p>
                 </div>
                                   <Button
                    variant="destructive"
                    onClick={() => setShowDeleteModal(true)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Delete Event
                  </Button>
               </div>
             </CardContent>
           </Card>
                   </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <X className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delete Event
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete "{event.name}"? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    router.delete(`/profile/events/${event.id}`, {
                      onSuccess: () => {
                        toast.success('Event deleted successfully!')
                        router.visit('/profile/events')
                      },
                      onError: () => {
                        toast.error('Failed to delete event. Please try again.')
                      }
                    })
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <X className="w-4 h-4 mr-2" />
                  Delete Event
                </Button>
              </div>
            </div>
          </div>
        )}
      </ProfileLayout>
    )
  }
