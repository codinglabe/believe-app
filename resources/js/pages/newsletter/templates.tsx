"use client"

import { Head } from "@inertiajs/react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Link } from "@inertiajs/react"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { useState, useEffect } from "react"
import { 
    FileText, 
    Plus, 
    Edit, 
    Trash2, 
    Eye,
    Calendar,
    Mail,
    Monitor,
    X
} from "lucide-react"

interface Template {
    id: number
    name: string
    subject: string
    template_type: string
    is_active: boolean
    created_at: string
    html_content?: string
    frequency_limit: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom'
    custom_frequency_days?: number
    frequency_notes?: string
    organization: {
        name: string
    }
}

interface NewsletterTemplatesProps {
    templates: {
        data: Template[]
        links: any[]
        meta: any
    }
}

export default function NewsletterTemplates({ templates }: NewsletterTemplatesProps) {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null)
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
    const [modalPreviewTemplate, setModalPreviewTemplate] = useState<Template | null>(null)

    const getTemplateTypeColor = (type: string) => {
        switch (type) {
            case 'newsletter': return 'bg-blue-100 text-blue-800'
            case 'announcement': return 'bg-green-100 text-green-800'
            case 'event': return 'bg-purple-100 text-purple-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const handlePreviewClick = (template: Template) => {
        if (template.html_content) {
            setModalPreviewTemplate(template)
            setIsPreviewModalOpen(true)
        }
    }

    const closePreviewModal = () => {
        setIsPreviewModalOpen(false)
        setModalPreviewTemplate(null)
    }

    const getFrequencyDisplay = (template: Template) => {
        switch (template.frequency_limit) {
            case 'none':
                return 'No limit'
            case 'daily':
                return 'Daily'
            case 'weekly':
                return 'Weekly'
            case 'monthly':
                return 'Monthly'
            case 'custom':
                return `Every ${template.custom_frequency_days || 1} days`
            default:
                return 'No limit'
        }
    }

    const getFrequencyColor = (template: Template) => {
        switch (template.frequency_limit) {
            case 'none':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
            case 'daily':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            case 'weekly':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            case 'monthly':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            case 'custom':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
        }
    }

    // Handle escape key to close modal
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isPreviewModalOpen) {
                closePreviewModal()
            }
        }

        if (isPreviewModalOpen) {
            document.addEventListener('keydown', handleEscape)
            document.body.style.overflow = 'hidden' // Prevent background scrolling
        }

        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = 'unset'
        }
    }, [isPreviewModalOpen])

    return (
        <AppSidebarLayout>
            <Head title="Newsletter Templates" />
            <style>{`
                .newsletter-preview-content {
                    max-width: 100%;
                    overflow-x: auto;
                    font-size: 12px;
                }
                .newsletter-preview-content * {
                    max-width: 100% !important;
                    box-sizing: border-box;
                }
                .newsletter-preview-content table {
                    width: 100% !important;
                    max-width: 100% !important;
                    font-size: inherit;
                }
                .newsletter-preview-content img {
                    max-width: 100% !important;
                    height: auto !important;
                }
                .newsletter-preview-content h1,
                .newsletter-preview-content h2,
                .newsletter-preview-content h3 {
                    font-size: 1.2em !important;
                    margin: 0.5em 0 !important;
                }
                .newsletter-preview-content p {
                    font-size: 1em !important;
                    margin: 0.5em 0 !important;
                }
                .newsletter-preview-content .container {
                    max-width: 100% !important;
                    margin: 0 !important;
                    padding: 0.5rem !important;
                }
                @media (min-width: 640px) {
                    .newsletter-preview-content {
                        font-size: 14px;
                    }
                }
                @media (min-width: 1024px) {
                    .newsletter-preview-content {
                        font-size: 16px;
                    }
                }
            `}</style>
            
            <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 m-10">
                {/* Header */}
                <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2 animate-in slide-in-from-left duration-700">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                            Newsletter Templates
                        </h1>
                        <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-400">
                            Manage your email templates
                        </p>
                    </div>
                    <div className="animate-in slide-in-from-right duration-700">
                        <Link href={route('newsletter.templates.create')}>
                            <Button
                                size="lg"
                                className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                            >
                                <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                                <span className="hidden sm:inline">Create Template</span>
                                <span className="sm:hidden">Create</span>
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Templates Grid */}
                {templates.data.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.data.map((template, index) => (
                            <motion.div
                                key={template.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                            >
                                <Card className="h-full shadow-lg hover:shadow-xl transition-all duration-300 relative">
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <CardTitle className="text-lg mb-2">
                                                    {template.name}
                                                </CardTitle>
                                                <CardDescription className="mb-3">
                                                    {template.subject}
                                                </CardDescription>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge className={getTemplateTypeColor(template.template_type)}>
                                                    {template.template_type}
                                                </Badge>
                                                <Badge className={getFrequencyColor(template)}>
                                                    {getFrequencyDisplay(template)}
                                                </Badge>
                                                {template.is_active ? (
                                                    <Badge className="bg-green-100 text-green-800">
                                                        Active
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-gray-100 text-gray-800">
                                                        Inactive
                                                    </Badge>
                                                )}
                                                {template.html_content && (
                                                    <button
                                                        onClick={() => handlePreviewClick(template)}
                                                        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 cursor-pointer"
                                                        title="Click to preview template"
                                                    >
                                                        <Monitor className="h-3 w-3" />
                                                        <span>Preview</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4" />
                                                    <span>Created {formatDate(template.created_at)}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                {/* Secondary Actions */}
                                                <div className="flex items-center gap-2">
                                                    <Link href={route('newsletter.templates.show', template.id)} className="flex-1">
                                                        <Button variant="outline" className="w-full border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300 py-2.5">
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            View
                                                        </Button>
                                                    </Link>
                                                    
                                                    <Link href={route('newsletter.templates.edit', template.id)} className="flex-1">
                                                        <Button variant="outline" className="w-full border-2 border-gray-300 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-300 py-2.5">
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            Edit
                                                        </Button>
                                                    </Link>
                                                    
                                                    <Button 
                                                        variant="outline"
                                                        className="flex-1 border-2 border-gray-300 dark:border-gray-600 hover:border-red-500 dark:hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 py-2.5"
                                                        onClick={() => {
                                                            setTemplateToDelete(template);
                                                            setIsDeleteModalOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </Button>
                                                </div>
                                                
                                                {/* Primary Action - Use Template (at bottom) */}
                                                <Link href={route('newsletter.create', { template: template.id })}>
                                                    <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl">
                                                        <Mail className="h-4 w-4 mr-2" />
                                                        Use Template
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <Card>
                                <CardContent className="text-center py-12">
                                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        No templates yet
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                                        Create your first template to start building consistent newsletters
                                    </p>
                                    <Link href={route('newsletter.templates.create')}>
                                        <Button className="flex items-center gap-2">
                                            <Plus className="h-4 w-4" />
                                            Create Template
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Pagination */}
                    {templates.links && templates.links.length > 3 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.6 }}
                            className="mt-8"
                        >
                            <div className="flex justify-center">
                                <div className="flex items-center gap-2">
                                    {templates.links.map((link, index) => (
                                        <Link
                                            key={index}
                                            href={link.url || '#'}
                                            className={`px-3 py-2 rounded-md text-sm font-medium ${
                                                link.active
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                            } ${!link.url ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                {/* Delete Confirmation Modal */}
                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onChange={setIsDeleteModalOpen}
                    title="Delete Template"
                    description={`Are you sure you want to delete "${templateToDelete?.name}"? This action cannot be undone.`}
                    confirmLabel="Delete"
                    cancelLabel="Cancel"
                    onConfirm={() => {
                        if (templateToDelete) {
                            const form = document.createElement('form');
                            form.method = 'POST';
                            form.action = route('newsletter.templates.destroy', templateToDelete.id);
                            
                            const methodInput = document.createElement('input');
                            methodInput.type = 'hidden';
                            methodInput.name = '_method';
                            methodInput.value = 'DELETE';
                            
                            const token = document.createElement('input');
                            token.type = 'hidden';
                            token.name = '_token';
                            token.value = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
                            
                            form.appendChild(methodInput);
                            form.appendChild(token);
                            document.body.appendChild(form);
                            form.submit();
                        }
                    }}
                />


                {/* Animated Preview Modal */}
                {isPreviewModalOpen && modalPreviewTemplate && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black bg-opacity-50"
                        onClick={closePreviewModal}
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-xs sm:max-w-sm md:max-w-2xl lg:max-w-4xl xl:max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-3 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                    <Monitor className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">
                                            {modalPreviewTemplate.name}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                                            {modalPreviewTemplate.subject}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={closePreviewModal}
                                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 flex-shrink-0"
                                >
                                    <X className="h-5 w-5 sm:h-6 sm:w-6" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(95vh-140px)] sm:max-h-[calc(90vh-120px)]">
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 sm:p-4 border border-gray-200 dark:border-gray-700">
                                    <div 
                                        className="newsletter-preview-content"
                                        dangerouslySetInnerHTML={{ 
                                            __html: modalPreviewTemplate.html_content || '' 
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                    <Monitor className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span>Template Preview</span>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                                    <Button
                                        variant="outline"
                                        onClick={closePreviewModal}
                                        className="px-3 sm:px-6 text-xs sm:text-sm flex-1 sm:flex-none"
                                    >
                                        Close
                                    </Button>
                                    <Link href={route('newsletter.templates.show', modalPreviewTemplate.id)} className="flex-1 sm:flex-none">
                                        <Button className="px-3 sm:px-6 text-xs sm:text-sm w-full">
                                            <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                            <span className="hidden sm:inline">View Details</span>
                                            <span className="sm:hidden">View</span>
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </div>
        </AppSidebarLayout>
    )
}
