"use client"

import { Head } from "@inertiajs/react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import { useState } from "react"
import { useForm } from "@inertiajs/react"
import { getBrowserTimezone, formatDateInTimezone, convertUserTimezoneToUTC } from "@/lib/timezone-detection"
import { 
    Mail, 
    Calendar,
    Users,
    Building,
    Target,
    Clock,
    Repeat,
    Send,
    ArrowLeft,
    Plus,
    X
} from "lucide-react"

interface Template {
    id: number
    name: string
    subject: string
    template_type: string
    html_content?: string
}

interface User {
    id: number
    name: string
    email: string
    roles: string[]
}

interface Organization {
    id: number
    name: string
    email: string
    status: string
}

interface CreateAdvancedNewsletterProps {
    templates: Template[]
    users: User[]
    organizations: Organization[]
    roles: string[]
}

export default function CreateAdvancedNewsletter({ 
    templates, 
    users, 
    organizations, 
    roles 
}: CreateAdvancedNewsletterProps) {
    const { data, setData, post, processing, errors } = useForm({
        newsletter_template_id: '',
        subject: '',
        content: '',
        html_content: '',
        schedule_type: 'immediate' as 'immediate' | 'scheduled' | 'recurring',
        send_date: '',
        recurring_settings: {},
        target_type: 'all' as 'all' | 'users' | 'organizations' | 'specific',
        target_users: [] as number[],
        target_organizations: [] as number[],
        target_roles: [] as string[],
        target_criteria: {},
        is_public: false,
    })

    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
    const [selectedUsers, setSelectedUsers] = useState<number[]>([])
    const [selectedOrganizations, setSelectedOrganizations] = useState<number[]>([])
    const [selectedRoles, setSelectedRoles] = useState<string[]>([])
    const [recurringType, setRecurringType] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
    const [recurringInterval, setRecurringInterval] = useState(1)

    const handleUserToggle = (userId: number) => {
        const newUsers = selectedUsers.includes(userId) 
            ? selectedUsers.filter(id => id !== userId)
            : [...selectedUsers, userId]
        
        setSelectedUsers(newUsers)
        setData('target_users', newUsers)
    }

    const handleOrganizationToggle = (orgId: number) => {
        const newOrgs = selectedOrganizations.includes(orgId) 
            ? selectedOrganizations.filter(id => id !== orgId)
            : [...selectedOrganizations, orgId]
        
        setSelectedOrganizations(newOrgs)
        setData('target_organizations', newOrgs)
    }

    const handleRoleToggle = (role: string) => {
        const newRoles = selectedRoles.includes(role) 
            ? selectedRoles.filter(r => r !== role)
            : [...selectedRoles, role]
        
        setSelectedRoles(newRoles)
        setData('target_roles', newRoles)
    }

    const handleTemplateSelect = (templateId: string) => {
        const template = templates.find(t => t.id === parseInt(templateId))
        setSelectedTemplate(template || null)
        
        if (template) {
            setData({
                ...data,
                newsletter_template_id: templateId,
                subject: template.subject,
                content: template.html_content || '',
                html_content: template.html_content || '',
            })
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        
        console.log('Form data before submit:', data)
        console.log('Selected users:', selectedUsers)
        console.log('Selected organizations:', selectedOrganizations)
        console.log('Selected roles:', selectedRoles)
        
        // Update recurring settings
        const recurringSettings = data.schedule_type === 'recurring' ? {
            type: recurringType,
            interval: recurringInterval,
        } : {}

        // Prepare submit data - only include send_date if needed
        const submitData = {
            ...data,
            recurring_settings: recurringSettings,
            target_users: selectedUsers,
            target_organizations: selectedOrganizations,
            target_roles: selectedRoles,
        }

        // Only include send_date if schedule_type is scheduled or recurring
        if (data.schedule_type === 'immediate') {
            delete submitData.send_date
        } else if (data.schedule_type !== 'immediate' && data.send_date) {
            // Convert user's timezone to UTC before sending
            const utcDate = convertUserTimezoneToUTC(data.send_date, getBrowserTimezone())
            submitData.send_date = utcDate.toISOString()
        } else if (data.schedule_type !== 'immediate' && (!data.send_date || data.send_date === '')) {
            submitData.send_date = null
        }

        console.log('Submitting data:', submitData)

        post(route('newsletter.store'), submitData)
    }

    const getTargetCount = () => {
        switch (data.target_type) {
            case 'all':
                return users.length + organizations.length
            case 'users':
                return selectedUsers.length
            case 'organizations':
                return selectedOrganizations.length
            case 'specific':
                return selectedUsers.length + selectedOrganizations.length + selectedRoles.length
            default:
                return 0
        }
    }

    return (
        <AppSidebarLayout>
            <Head title="Create Advanced Newsletter" />
            
            <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500 m-10">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => window.history.back()}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            Create Advanced Newsletter
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Schedule and target your newsletter with precision
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Template Selection */}
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Mail className="h-5 w-5" />
                                    Template
                                </CardTitle>
                                <CardDescription>
                                    Choose a template for your newsletter
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Select onValueChange={handleTemplateSelect}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a template" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {templates.map((template) => (
                                            <SelectItem key={template.id} value={template.id.toString()}>
                                                {template.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {selectedTemplate && (
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <h4 className="font-semibold text-sm mb-2">{selectedTemplate.name}</h4>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                            {selectedTemplate.subject}
                                        </p>
                                        <Badge variant="outline" className="text-xs">
                                            {selectedTemplate.template_type}
                                        </Badge>
                                    </div>
                                )}
                                
                                {errors.newsletter_template_id && (
                                    <p className="text-sm text-red-600 dark:text-red-400">
                                        {errors.newsletter_template_id}
                                    </p>
                                )}
                                
                                {errors.send_date && (
                                    <p className="text-sm text-red-600 dark:text-red-400">
                                        {errors.send_date}
                                    </p>
                                )}
                                
                                {Object.keys(errors).length > 0 && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                        <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-2">
                                            Please fix the following errors:
                                        </p>
                                        <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                                            {Object.entries(errors).map(([field, message]) => (
                                                <li key={field}>• {message}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Scheduling */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Scheduling
                                </CardTitle>
                                <CardDescription>
                                    When should this newsletter be sent?
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Button
                                        type="button"
                                        variant={data.schedule_type === 'immediate' ? 'default' : 'outline'}
                                        onClick={() => setData('schedule_type', 'immediate')}
                                        className="flex items-center gap-2"
                                    >
                                        <Send className="h-4 w-4" />
                                        Immediate
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={data.schedule_type === 'scheduled' ? 'default' : 'outline'}
                                        onClick={() => setData('schedule_type', 'scheduled')}
                                        className="flex items-center gap-2"
                                    >
                                        <Clock className="h-4 w-4" />
                                        Scheduled
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={data.schedule_type === 'recurring' ? 'default' : 'outline'}
                                        onClick={() => setData('schedule_type', 'recurring')}
                                        className="flex items-center gap-2"
                                    >
                                        <Repeat className="h-4 w-4" />
                                        Recurring
                                    </Button>
                                </div>

                                {data.schedule_type === 'scheduled' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="sendDate">Send Date & Time</Label>
                                        <Input
                                            id="sendDate"
                                            type="datetime-local"
                                            value={data.send_date}
                                            onChange={(e) => setData('send_date', e.target.value)}
                                        />
                                    </div>
                                )}

                                {data.schedule_type === 'recurring' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Recurring Type</Label>
                                            <Select value={recurringType} onValueChange={setRecurringType}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="daily">Daily</SelectItem>
                                                    <SelectItem value="weekly">Weekly</SelectItem>
                                                    <SelectItem value="monthly">Monthly</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Every (interval)</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={recurringInterval}
                                                onChange={(e) => setRecurringInterval(parseInt(e.target.value) || 1)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Targeting */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Target className="h-5 w-5" />
                                    Targeting
                                </CardTitle>
                                <CardDescription>
                                    Who should receive this newsletter?
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <Button
                                        type="button"
                                        variant={data.target_type === 'all' ? 'default' : 'outline'}
                                        onClick={() => setData('target_type', 'all')}
                                        size="sm"
                                    >
                                        All Users
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={data.target_type === 'users' ? 'default' : 'outline'}
                                        onClick={() => setData('target_type', 'users')}
                                        size="sm"
                                    >
                                        Specific Users
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={data.target_type === 'organizations' ? 'default' : 'outline'}
                                        onClick={() => setData('target_type', 'organizations')}
                                        size="sm"
                                    >
                                        Organizations
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={data.target_type === 'specific' ? 'default' : 'outline'}
                                        onClick={() => setData('target_type', 'specific')}
                                        size="sm"
                                    >
                                        Custom
                                    </Button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        Target Count: {getTargetCount()}
                                    </span>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="isPublic"
                                            checked={data.is_public}
                                            onCheckedChange={(checked) => setData('is_public', checked as boolean)}
                                        />
                                        <Label htmlFor="isPublic" className="text-sm">
                                            Public Newsletter
                                        </Label>
                                    </div>
                                </div>

                                {/* User Selection */}
                                {(data.target_type === 'users' || data.target_type === 'specific') && (
                                    <div className="space-y-2">
                                        <Label>Select Users</Label>
                                        <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-2">
                                            {users.map((user) => (
                                                <div key={user.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`user-${user.id}`}
                                                        checked={selectedUsers.includes(user.id)}
                                                        onCheckedChange={() => handleUserToggle(user.id)}
                                                    />
                                                    <Label htmlFor={`user-${user.id}`} className="text-sm">
                                                        {user.name} ({user.email})
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Organization Selection */}
                                {(data.target_type === 'organizations' || data.target_type === 'specific') && (
                                    <div className="space-y-2">
                                        <Label>Select Organizations</Label>
                                        <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-2">
                                            {organizations.map((org) => (
                                                <div key={org.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`org-${org.id}`}
                                                        checked={selectedOrganizations.includes(org.id)}
                                                        onCheckedChange={() => handleOrganizationToggle(org.id)}
                                                    />
                                                    <Label htmlFor={`org-${org.id}`} className="text-sm">
                                                        {org.name} ({org.email})
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Role Selection */}
                                {data.target_type === 'specific' && (
                                    <div className="space-y-2">
                                        <Label>Select Roles</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {roles.map((role) => (
                                                <Button
                                                    key={role}
                                                    variant={selectedRoles.includes(role) ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => handleRoleToggle(role)}
                                                >
                                                    {role}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-4">
                            <Button 
                                type="button"
                                variant="outline" 
                                onClick={() => window.history.back()}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit"
                                disabled={!selectedTemplate || processing}
                                className="flex items-center gap-2"
                            >
                                <Send className="h-4 w-4" />
                                {processing ? 'Creating...' : 'Create Newsletter'}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </AppSidebarLayout>
    )
}
