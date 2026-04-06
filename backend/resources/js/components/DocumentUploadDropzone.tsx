"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, X, FileText, File, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface DocumentUploadDropzoneProps {
    label: string
    value: string // Base64 string
    onChange: (base64: string) => void
    required?: boolean
    accept?: string
    maxSizeMB?: number
    description?: string
}

export function DocumentUploadDropzone({
    label,
    value,
    onChange,
    required = false,
    accept = '.pdf,.jpg,.jpeg,.png',
    maxSizeMB = 10,
    description,
}: DocumentUploadDropzoneProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [fileName, setFileName] = useState<string | null>(null)
    const [fileType, setFileType] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Check if document is uploaded
    const isUploaded = !!value

    const handleFile = useCallback((file: File) => {
        // Validate file type
        const validTypes = accept.split(',').map(t => t.trim().toLowerCase())
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
        const fileTypeLower = file.type.toLowerCase()
        
        const isValidType = validTypes.some(validType => {
            if (validType.startsWith('.')) {
                return fileExtension === validType
            }
            if (validType.includes('*')) {
                const baseType = validType.split('/')[0]
                return fileTypeLower.startsWith(baseType + '/')
            }
            return fileTypeLower === validType || fileTypeLower.includes(validType.replace('.', ''))
        })

        if (!isValidType) {
            alert(`Please upload a valid file type: ${accept}`)
            return
        }

        // Validate file size
        const maxSize = maxSizeMB * 1024 * 1024 // Convert MB to bytes
        if (file.size > maxSize) {
            alert(`File size must be less than ${maxSizeMB}MB`)
            return
        }

        setFileName(file.name)
        setFileType(file.type)

        // Convert to base64
        const reader = new FileReader()
        reader.onloadend = () => {
            const result = reader.result as string
            // Pass full data URL (includes data:application/pdf;base64, prefix) for PDFs
            // This matches what convertPdfToBase64 returns
            onChange(result)
        }
        reader.onerror = () => {
            alert('Failed to read file')
        }
        reader.readAsDataURL(file)
    }, [onChange, maxSizeMB, accept])

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        const file = e.dataTransfer.files?.[0]
        if (file) {
            handleFile(file)
        }
    }, [handleFile])

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            handleFile(file)
        }
    }, [handleFile])

    const handleRemove = useCallback(() => {
        setFileName(null)
        setFileType(null)
        onChange('')
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }, [onChange])

    const handleClick = useCallback(() => {
        fileInputRef.current?.click()
    }, [])

    const getFileIcon = () => {
        if (fileType?.includes('pdf')) {
            return <FileText className="h-8 w-8" />
        }
        return <File className="h-8 w-8" />
    }

    return (
        <div className="w-full">
            <label className="text-xs font-medium mb-1 block text-left">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {description && (
                <p className="text-xs text-muted-foreground mb-2 text-left">{description}</p>
            )}
            
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
                className={`
                    relative w-full border-2 border-dashed rounded-lg transition-all cursor-pointer
                    ${isDragging 
                        ? 'border-primary bg-primary/10' 
                        : isUploaded
                        ? 'border-green-500/50 bg-green-50/50 dark:bg-green-900/10 hover:border-green-500'
                        : 'border-border hover:border-primary/50 bg-muted/30'
                    }
                `}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    onChange={handleFileInputChange}
                    className="hidden"
                />

                <AnimatePresence mode="wait">
                    {isUploaded ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full p-4"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 p-2 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                                    {getFileIcon()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {fileName || 'Document uploaded'}
                                        </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Click to change document
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemove()
                                    }}
                                    className="flex-shrink-0 p-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center p-6 py-8 space-y-3"
                        >
                            <div className={`p-4 rounded-full transition-colors ${
                                isDragging 
                                    ? 'bg-primary/20 text-primary' 
                                    : 'bg-muted text-muted-foreground'
                            }`}>
                                {isDragging ? (
                                    <Upload className="h-8 w-8" />
                                ) : (
                                    <FileText className="h-8 w-8" />
                                )}
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-sm font-medium text-foreground">
                                    {isDragging ? 'Drop document here' : 'Drag & drop document here'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    or click to browse
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Accepted: PDF, JPG, PNG (Max {maxSizeMB}MB)
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

