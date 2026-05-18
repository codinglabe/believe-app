import { motion } from 'framer-motion'
import { useState } from 'react'
import { Building2, Loader2, ArrowLeft, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

interface AddBankAccountProps {
    isLoading: boolean
    onLinkAccount: (accountData: {
        routing_number: string
        account_number: string
        account_type: 'checking' | 'savings'
        account_holder_name: string
        bank_name: string
        first_name: string
        last_name: string
        street_line_1: string
        city: string
        state: string
        postal_code: string
        country: string
    }) => void
    onCancel: () => void
}

export function AddBankAccount({
    isLoading,
    onLinkAccount,
    onCancel
}: AddBankAccountProps) {
    const [formData, setFormData] = useState({
        routing_number: '',
        account_number: '',
        account_type: '' as 'checking' | 'savings' | '',
        account_holder_name: '',
        bank_name: '',
        first_name: '',
        last_name: '',
        street_line_1: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'USA',
    })
    const [errors, setErrors] = useState<Record<string, string>>({})

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!formData.routing_number.trim()) {
            newErrors.routing_number = 'Routing number is required'
        } else if (!/^\d{9}$/.test(formData.routing_number.replace(/\D/g, ''))) {
            newErrors.routing_number = 'Routing number must be 9 digits'
        }

        if (!formData.account_number.trim()) {
            newErrors.account_number = 'Account number is required'
        } else if (formData.account_number.replace(/\D/g, '').length < 4) {
            newErrors.account_number = 'Account number must be at least 4 digits'
        }

        if (!formData.account_type) {
            newErrors.account_type = 'Account type is required'
        }

        if (!formData.account_holder_name.trim()) {
            newErrors.account_holder_name = 'Account holder name is required'
        }

        if (!formData.bank_name.trim()) {
            newErrors.bank_name = 'Bank name is required'
        }

        if (!formData.first_name.trim()) {
            newErrors.first_name = 'First name is required'
        }

        if (!formData.last_name.trim()) {
            newErrors.last_name = 'Last name is required'
        }

        if (!formData.street_line_1.trim()) {
            newErrors.street_line_1 = 'Street address is required'
        }

        if (!formData.city.trim()) {
            newErrors.city = 'City is required'
        }

        if (!formData.state.trim()) {
            newErrors.state = 'State is required'
        }

        if (!formData.postal_code.trim()) {
            newErrors.postal_code = 'Postal code is required'
        }

        if (!formData.country.trim()) {
            newErrors.country = 'Country is required'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        // Format routing number (remove non-digits)
        const routingNumber = formData.routing_number.replace(/\D/g, '')
        const accountNumber = formData.account_number.replace(/\D/g, '')

        onLinkAccount({
            routing_number: routingNumber,
            account_number: accountNumber,
            account_type: formData.account_type as 'checking' | 'savings',
            account_holder_name: formData.account_holder_name.trim(),
            bank_name: formData.bank_name.trim(),
            first_name: formData.first_name.trim(),
            last_name: formData.last_name.trim(),
            street_line_1: formData.street_line_1.trim(),
            city: formData.city.trim(),
            state: formData.state.trim(),
            postal_code: formData.postal_code.trim(),
            country: formData.country.trim(),
        })
    }

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[field]
                return newErrors
            })
        }
    }

    const formatRoutingNumber = (value: string) => {
        // Remove all non-digits
        const digits = value.replace(/\D/g, '')
        // Limit to 9 digits
        return digits.slice(0, 9)
    }

    const formatAccountNumber = (value: string) => {
        // Remove all non-digits
        return value.replace(/\D/g, '')
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="p-4 space-y-4"
        >
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="h-8 w-8 p-0"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Add Bank Account</h3>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Account Holder Name */}
                    <div className="space-y-2">
                        <Label htmlFor="account_holder_name">
                            Account Holder Name <span className="text-red-500">*</span>
                        </Label>
                        <input
                            id="account_holder_name"
                            type="text"
                            placeholder="John Doe"
                            value={formData.account_holder_name}
                            onChange={(e) => handleInputChange('account_holder_name', e.target.value)}
                            disabled={isLoading}
                            className={`w-full px-4 py-2.5 bg-muted border ${errors.account_holder_name ? 'border-red-500' : 'border-border'} rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200`}
                        />
                        {errors.account_holder_name && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {errors.account_holder_name}
                            </p>
                        )}
                    </div>

                    {/* Routing Number */}
                    <div className="space-y-2">
                        <Label htmlFor="routing_number">
                            Routing Number <span className="text-red-500">*</span>
                        </Label>
                        <input
                            id="routing_number"
                            type="text"
                            placeholder="123456789"
                            value={formData.routing_number}
                            onChange={(e) => handleInputChange('routing_number', formatRoutingNumber(e.target.value))}
                            disabled={isLoading}
                            maxLength={9}
                            className={`w-full px-4 py-2.5 bg-muted border ${errors.routing_number ? 'border-red-500' : 'border-border'} rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200`}
                        />
                        {errors.routing_number && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {errors.routing_number}
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            9-digit routing number (found on your checks or bank statement)
                        </p>
                    </div>

                    {/* Account Number */}
                    <div className="space-y-2">
                        <Label htmlFor="account_number">
                            Account Number <span className="text-red-500">*</span>
                        </Label>
                        <input
                            id="account_number"
                            type="text"
                            placeholder="000123456789"
                            value={formData.account_number}
                            onChange={(e) => handleInputChange('account_number', formatAccountNumber(e.target.value))}
                            disabled={isLoading}
                            className={`w-full px-4 py-2.5 bg-muted border ${errors.account_number ? 'border-red-500' : 'border-border'} rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200`}
                        />
                        {errors.account_number && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {errors.account_number}
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Your bank account number
                        </p>
                    </div>

                    {/* Account Type */}
                    <div className="space-y-2">
                        <Label htmlFor="account_type">
                            Account Type <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={formData.account_type}
                            onValueChange={(value) => handleInputChange('account_type', value)}
                            disabled={isLoading}
                        >
                            <SelectTrigger className={`w-full h-auto px-4 py-2.5 bg-muted border ${errors.account_type ? 'border-red-500' : 'border-border'} rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200`}>
                                <SelectValue placeholder="Select account type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="checking">Checking</SelectItem>
                                <SelectItem value="savings">Savings</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.account_type && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {errors.account_type}
                            </p>
                        )}
                    </div>

                    {/* Bank Name */}
                    <div className="space-y-2">
                        <Label htmlFor="bank_name">
                            Bank Name <span className="text-red-500">*</span>
                        </Label>
                        <input
                            id="bank_name"
                            type="text"
                            placeholder="e.g., Chase Bank, Bank of America"
                            value={formData.bank_name}
                            onChange={(e) => handleInputChange('bank_name', e.target.value)}
                            disabled={isLoading}
                            className={`w-full px-4 py-2.5 bg-muted border ${errors.bank_name ? 'border-red-500' : 'border-border'} rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200`}
                        />
                        {errors.bank_name && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {errors.bank_name}
                            </p>
                        )}
                    </div>

                    {/* First Name */}
                    <div className="space-y-2">
                        <Label htmlFor="first_name">
                            First Name <span className="text-red-500">*</span>
                        </Label>
                        <input
                            id="first_name"
                            type="text"
                            placeholder="John"
                            value={formData.first_name}
                            onChange={(e) => handleInputChange('first_name', e.target.value)}
                            disabled={isLoading}
                            className={`w-full px-4 py-2.5 bg-muted border ${errors.first_name ? 'border-red-500' : 'border-border'} rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200`}
                        />
                        {errors.first_name && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {errors.first_name}
                            </p>
                        )}
                    </div>

                    {/* Last Name */}
                    <div className="space-y-2">
                        <Label htmlFor="last_name">
                            Last Name <span className="text-red-500">*</span>
                        </Label>
                        <input
                            id="last_name"
                            type="text"
                            placeholder="Doe"
                            value={formData.last_name}
                            onChange={(e) => handleInputChange('last_name', e.target.value)}
                            disabled={isLoading}
                            className={`w-full px-4 py-2.5 bg-muted border ${errors.last_name ? 'border-red-500' : 'border-border'} rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200`}
                        />
                        {errors.last_name && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {errors.last_name}
                            </p>
                        )}
                    </div>

                    {/* Street Address */}
                    <div className="space-y-2">
                        <Label htmlFor="street_line_1">
                            Street Address <span className="text-red-500">*</span>
                        </Label>
                        <input
                            id="street_line_1"
                            type="text"
                            placeholder="123 Main Street"
                            value={formData.street_line_1}
                            onChange={(e) => handleInputChange('street_line_1', e.target.value)}
                            disabled={isLoading}
                            className={`w-full px-4 py-2.5 bg-muted border ${errors.street_line_1 ? 'border-red-500' : 'border-border'} rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200`}
                        />
                        {errors.street_line_1 && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {errors.street_line_1}
                            </p>
                        )}
                    </div>

                    {/* City */}
                    <div className="space-y-2">
                        <Label htmlFor="city">
                            City <span className="text-red-500">*</span>
                        </Label>
                        <input
                            id="city"
                            type="text"
                            placeholder="San Francisco"
                            value={formData.city}
                            onChange={(e) => handleInputChange('city', e.target.value)}
                            disabled={isLoading}
                            className={`w-full px-4 py-2.5 bg-muted border ${errors.city ? 'border-red-500' : 'border-border'} rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200`}
                        />
                        {errors.city && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {errors.city}
                            </p>
                        )}
                    </div>

                    {/* State and Postal Code - Side by Side */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="state">
                                State <span className="text-red-500">*</span>
                            </Label>
                            <input
                                id="state"
                                type="text"
                                placeholder="CA"
                                value={formData.state}
                                onChange={(e) => handleInputChange('state', e.target.value.toUpperCase())}
                                disabled={isLoading}
                                maxLength={2}
                                className={`w-full px-4 py-2.5 bg-muted border ${errors.state ? 'border-red-500' : 'border-border'} rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200`}
                            />
                            {errors.state && (
                                <p className="text-xs text-red-500 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {errors.state}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="postal_code">
                                Postal Code <span className="text-red-500">*</span>
                            </Label>
                            <input
                                id="postal_code"
                                type="text"
                                placeholder="94107"
                                value={formData.postal_code}
                                onChange={(e) => handleInputChange('postal_code', e.target.value)}
                                disabled={isLoading}
                                className={`w-full px-4 py-2.5 bg-muted border ${errors.postal_code ? 'border-red-500' : 'border-border'} rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200`}
                            />
                            {errors.postal_code && (
                                <p className="text-xs text-red-500 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {errors.postal_code}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Country */}
                    <div className="space-y-2">
                        <Label htmlFor="country">
                            Country <span className="text-red-500">*</span>
                        </Label>
                        <input
                            id="country"
                            type="text"
                            placeholder="USA"
                            value={formData.country}
                            onChange={(e) => handleInputChange('country', e.target.value)}
                            disabled={isLoading}
                            className={`w-full px-4 py-2.5 bg-muted border ${errors.country ? 'border-red-500' : 'border-border'} rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200`}
                        />
                        {errors.country && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {errors.country}
                            </p>
                        )}
                    </div>

                    {/* Security Notice */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-xs text-blue-800 dark:text-blue-200">
                            <strong>Security:</strong> Your bank account information is encrypted and securely stored. 
                            We use industry-standard security measures to protect your data.
                        </p>
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={isLoading}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Linking...
                                </>
                            ) : (
                                <>
                                    <Building2 className="h-4 w-4 mr-2" />
                                    Link Account
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </motion.div>
    )
}

