import { ImageUploadDropzone } from '@/components/ImageUploadDropzone'
import { KycFormData } from './types'
import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'

interface KYCFormProps {
    formData: KycFormData
    isLoading: boolean
    onFormDataChange: (data: KycFormData) => void
    onSubmit: () => void
    kycStatus?: 'not_started' | 'incomplete' | 'under_review' | 'awaiting_questionnaire' | 'awaiting_ubo' | 'approved' | 'rejected' | 'paused' | 'offboarded'
    kycSubmitted?: boolean
}

export function KYCForm({
    formData,
    isLoading,
    onFormDataChange,
    onSubmit,
    kycStatus = 'not_started',
    kycSubmitted = false
}: KYCFormProps) {
    const handleFieldChange = (field: keyof KycFormData, value: string) => {
        onFormDataChange({
            ...formData,
            [field]: value
        })
    }

    const handleIdTypeChange = (idType: string) => {
        // Clear back image when switching to passport
        onFormDataChange({
            ...formData,
            id_type: idType,
            id_back_image: idType === 'passport' ? '' : formData.id_back_image
        })
    }

    // Show waiting screen if KYC has been submitted OR status is pending/under review
    const shouldShowWaitingScreen = kycSubmitted || (kycStatus !== 'not_started' && kycStatus !== 'approved' && kycStatus !== 'rejected')

    // Show form only when status is not_started (and not submitted) or rejected
    const shouldShowForm = !shouldShowWaitingScreen

    if (shouldShowWaitingScreen) {
        return (
            <div className="flex flex-col items-center justify-center py-8 px-4 space-y-4 w-full">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center"
                >
                    <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </motion.div>
                <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold text-foreground">KYC Verification Pending</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        Your KYC information has been successfully submitted and is being reviewed.
                    </p>
                    <p className="text-xs text-muted-foreground mt-3">
                        Please wait while we verify your identity. You will be notified once the verification is complete.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-2 sm:space-y-3 max-h-[250px] sm:max-h-[350px] overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full -mx-0">
            {/* Personal Information Section */}
            <div className="space-y-3">
                <h4 className="text-xs font-semibold text-foreground mb-2 text-left">Personal Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-medium mb-1.5 block text-left">
                            First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.first_name}
                            onChange={(e) => handleFieldChange('first_name', e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                            placeholder="John"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium mb-1.5 block text-left">
                            Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.last_name}
                            onChange={(e) => handleFieldChange('last_name', e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                            placeholder="Doe"
                            required
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-medium mb-1.5 block text-left">
                        Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleFieldChange('email', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                        placeholder="john@example.com"
                        required
                    />
                </div>
                <div>
                    <label className="text-xs font-medium mb-1.5 block text-left">
                        Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="date"
                        value={formData.birth_date}
                        onChange={(e) => handleFieldChange('birth_date', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                        required
                    />
                </div>
            </div>

            {/* Residential Address Section */}
            <div className="space-y-3 mt-4">
                <h4 className="text-xs font-semibold text-foreground mb-2 text-left">Residential Address</h4>
                <div>
                    <label className="text-xs font-medium mb-1.5 block text-left">
                        Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.street_line_1}
                        onChange={(e) => handleFieldChange('street_line_1', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                        placeholder="123 Main St"
                        required
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-medium mb-1.5 block text-left">
                            City <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.city}
                            onChange={(e) => handleFieldChange('city', e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                            placeholder="New York"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium mb-1.5 block text-left">
                            State <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.subdivision}
                            onChange={(e) => handleFieldChange('subdivision', e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                            placeholder="NY"
                            required
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-medium mb-1.5 block text-left">
                            ZIP Code <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.postal_code}
                            onChange={(e) => handleFieldChange('postal_code', e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                            placeholder="10001"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium mb-1.5 block text-left">
                            Country <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.country}
                            onChange={(e) => handleFieldChange('country', e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                            placeholder="USA"
                            required
                        />
                    </div>
                </div>
            </div>

            {/* Identification Information Section */}
            <div className="space-y-3 mt-4">
                <h4 className="text-xs font-semibold text-foreground mb-2 text-left">Identification Information</h4>
                <div>
                    <label className="text-xs font-medium mb-1.5 block text-left">
                        Social Security Number (SSN) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.ssn}
                        onChange={(e) => {
                            // Format SSN: remove non-digits, limit to 9 digits
                            const value = e.target.value.replace(/\D/g, '').slice(0, 9)
                            handleFieldChange('ssn', value)
                        }}
                        className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                        placeholder="123456789"
                        maxLength={9}
                        required
                    />
                    <p className="text-xs text-muted-foreground mt-1 text-left">Enter 9 digits without dashes</p>
                </div>
                <div>
                    <label className="text-xs font-medium mb-1.5 block text-left">
                        ID Type <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={formData.id_type}
                        onChange={(e) => handleIdTypeChange(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                        required
                    >
                        <option value="">Select ID Type</option>
                        <option value="drivers_license">Driver's License</option>
                        <option value="passport">Passport</option>
                        <option value="state_id">State ID</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-medium mb-1.5 block text-left">
                        ID Number <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.id_number}
                        onChange={(e) => handleFieldChange('id_number', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                        placeholder="DL123456"
                        required
                    />
                </div>
            </div>

            {/* ID Document Upload Section - Only show after ID type is selected */}
            {formData.id_type && (
                <div className="space-y-3 mt-4">
                    <h4 className="text-xs font-semibold text-foreground mb-2 text-left">ID Document Images</h4>
                    {formData.id_type === 'passport' ? (
                        // For passport, only show front image
                        <div className="space-y-3">
                            <ImageUploadDropzone
                                label="Passport Image"
                                value={typeof formData.id_front_image === 'string' ? formData.id_front_image : ''}
                                onChange={(base64) => handleFieldChange('id_front_image', base64 as string)}
                                required={true}
                                maxSizeMB={5}
                            />
                            <p className="text-xs text-muted-foreground text-left">
                                Upload a clear image of your passport. Image must be in JPG, PNG, or PDF format and under 5MB.
                            </p>
                        </div>
                    ) : (
                        // For drivers_license and state_id, show both front and back
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <ImageUploadDropzone
                                        label="ID Front Image"
                                        value={typeof formData.id_front_image === 'string' ? formData.id_front_image : ''}
                                        onChange={(base64) => handleFieldChange('id_front_image', base64 as string)}
                                        required={true}
                                        maxSizeMB={5}
                                    />
                                </div>
                                <div>
                                    <ImageUploadDropzone
                                        label="ID Back Image"
                                        value={typeof formData.id_back_image === 'string' ? formData.id_back_image : ''}
                                        onChange={(base64) => handleFieldChange('id_back_image', base64 as string)}
                                        required={true}
                                        maxSizeMB={5}
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground text-left">
                                Upload clear images of both sides of your {formData.id_type === 'drivers_license' ? "driver's license" : "state ID"}. Images must be in JPG, PNG, or PDF format and under 5MB.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

