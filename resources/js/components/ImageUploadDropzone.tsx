"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ImageUploadDropzoneProps {
    label: string
    value: string // Base64 string
    onChange: (base64: string) => void
    required?: boolean
    accept?: string
    maxSizeMB?: number
}

export function ImageUploadDropzone({
    label,
    value,
    onChange,
    required = false,
    accept = 'image/*',
    maxSizeMB = 5,
}: ImageUploadDropzoneProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [preview, setPreview] = useState<string | null>(() => {
        if (!value) return null
        // If value is already a data URL, use it directly
        if (value.startsWith('data:')) return value
        // Otherwise, it's a base64 string, add the data URL prefix
        return `data:image/jpeg;base64,${value}`
    })
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Update preview when value prop changes
    useEffect(() => {
        if (!value) {
            setPreview(null)
        } else if (value.startsWith('data:')) {
            setPreview(value)
        } else {
            setPreview(`data:image/jpeg;base64,${value}`)
        }
    }, [value])

    const handleFile = useCallback((file: File) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file')
            return
        }

        // Validate file size
        const maxSize = maxSizeMB * 1024 * 1024 // Convert MB to bytes
        if (file.size > maxSize) {
            alert(`Image size must be less than ${maxSizeMB}MB`)
            return
        }

        // Convert to base64
        const reader = new FileReader()
        reader.onloadend = () => {
            const result = reader.result as string
            // Extract base64 part (remove data:image/...;base64, prefix)
            const base64 = result.split(',')[1] || ''
            setPreview(result)
            onChange(base64)
        }
        reader.onerror = () => {
            alert('Failed to read image file')
        }
        reader.readAsDataURL(file)
    }, [onChange, maxSizeMB])

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
        setPreview(null)
        onChange('')
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }, [onChange])

    const handleClick = useCallback(() => {
        fileInputRef.current?.click()
    }, [])

    return (
        <div className="w-full">
            <label className="text-xs font-medium mb-1 block text-left">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
                className={`
                    relative w-full border-2 border-dashed rounded-lg transition-all cursor-pointer
                    ${isDragging 
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                        : preview
                        ? 'border-border hover:border-purple-400 dark:hover:border-purple-600'
                        : 'border-border hover:border-purple-400 dark:hover:border-purple-600 bg-muted/30'
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
                    {preview ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full"
                        >
                            <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-muted">
                                <img
                                    src={preview}
                                    alt="Preview"
                                    className="w-full h-full object-contain"
                                />
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemove()
                                    }}
                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors shadow-lg z-10"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 text-center">
                                Click to change image
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center p-6 py-8 space-y-3"
                        >
                            <div className={`p-3 rounded-full transition-colors ${
                                isDragging 
                                    ? 'bg-purple-100 dark:bg-purple-900/30' 
                                    : 'bg-muted'
                            }`}>
                                {isDragging ? (
                                    <Upload className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                ) : (
                                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                )}
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-sm font-medium text-foreground">
                                    {isDragging ? 'Drop image here' : 'Drag & drop image here'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    or click to browse
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Max size: {maxSizeMB}MB
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

