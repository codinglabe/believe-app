"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { Head, useForm, Link } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/admin/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem, RadioGroupLabel } from "@/components/admin/ui/radio-group"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Save, X, Upload, Plus, Crop, Check, RotateCw, RefreshCw, ArrowLeft, Edit, ImageIcon, Move3D, TrendingUp, Edit2 } from "lucide-react"
import type { NodeBoss } from "@/types/nodeboss"
import { Select } from "@/components/admin/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/admin/ui/switch"

interface CropperState {
    scale: number
    rotation: number
    x: number
    y: number
}

interface Props {
    auth: any
    nodeBoss: NodeBoss
}

export default function EditNodeBoss({ auth, nodeBoss }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: nodeBoss.name || "",
        price: nodeBoss.price || "", // Ensure price is a positive number
        _method: "PUT",
        description: nodeBoss.description || "",
        suggested_amounts: typeof nodeBoss.suggested_amounts === "string"
            ? JSON.parse(nodeBoss.suggested_amounts)
            : nodeBoss.suggested_amounts || [10, 25, 50, 100],
        is_closed: nodeBoss.is_closed || false,
        image: null as File | null,
        status: nodeBoss?.status || "active" || "inactive" || "draft",
    })


    const [dragActive, setDragActive] = useState(false)
    const [newSuggestedAmount, setNewSuggestedAmount] = useState("")

    // Image cropper states
    const [showCropper, setShowCropper] = useState(false)
    const [originalImage, setOriginalImage] = useState<string | null>(null)
    const [croppedImage, setCroppedImage] = useState<string | null>("/" + nodeBoss.image || null)
    const [imageLoaded, setImageLoaded] = useState(false)
    // Cropper controls
    const [cropperState, setCropperState] = useState<CropperState>({
        scale: 1,
        rotation: 0,
        x: 0,
        y: 0,
    })

    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const imageRef = useRef<HTMLImageElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        post(route("node-boss.update", nodeBoss.id))
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0]
            if (file.type.startsWith("image/")) {
                processImageFile(file)
            }
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            processImageFile(file)
        }
    }

    const processImageFile = (file: File) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const imageUrl = e.target?.result as string
            setOriginalImage(imageUrl)
            setImageLoaded(false)
            setShowCropper(true)

            // Reset cropper state
            setCropperState({
                scale: 1,
                rotation: 0,
                x: 0,
                y: 0,
            })
        }
        reader.readAsDataURL(file)
    }

    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current
        const img = imageRef.current

        if (!canvas || !img || !imageLoaded) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const container = containerRef.current
        if (!container) return

        const containerRect = container.getBoundingClientRect()
        const isMobile = window.innerWidth < 640
        const maxWidth = isMobile ? Math.min(350, containerRect.width - 16) : Math.min(500, containerRect.width - 32)
        const maxHeight = isMobile ? Math.min(200, containerRect.height - 16) : Math.min(280, containerRect.height - 32)

        canvas.width = maxWidth
        canvas.height = maxHeight

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.save()

        const centerX = canvas.width / 2
        const centerY = canvas.height / 2

        ctx.translate(centerX + cropperState.x, centerY + cropperState.y)
        ctx.rotate((cropperState.rotation * Math.PI) / 180)
        ctx.scale(cropperState.scale, cropperState.scale)

        const imgAspect = img.naturalWidth / img.naturalHeight
        const containerAspect = canvas.width / canvas.height

        let drawWidth: number, drawHeight: number
        if (imgAspect > containerAspect) {
            drawWidth = canvas.width * 0.8
            drawHeight = drawWidth / imgAspect
        } else {
            drawHeight = canvas.height * 0.8
            drawWidth = drawHeight * imgAspect
        }

        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
        ctx.restore()

        const cropWidth = Math.min(isMobile ? 280 : 350, canvas.width * 0.7)
        const cropHeight = Math.min(cropWidth * (196 / 436), canvas.height * 0.6)
        const cropX = (canvas.width - cropWidth) / 2
        const cropY = (canvas.height - cropHeight) / 2

        ctx.strokeStyle = "#3b82f6"
        ctx.lineWidth = 2
        ctx.strokeRect(cropX, cropY, cropWidth, cropHeight)

        const handleSize = isMobile ? 6 : 8
        ctx.fillStyle = "#3b82f6"
        const corners = [
            [cropX - handleSize / 2, cropY - handleSize / 2],
            [cropX + cropWidth - handleSize / 2, cropY - handleSize / 2],
            [cropX - handleSize / 2, cropY + cropHeight - handleSize / 2],
            [cropX + cropWidth - handleSize / 2, cropY + cropHeight - handleSize / 2],
        ]

        corners.forEach(([x, y]) => {
            ctx.fillRect(x, y, handleSize, handleSize)
        })

        ctx.strokeStyle = "#3b82f6"
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(cropX + cropWidth / 2, cropY)
        ctx.lineTo(cropX + cropWidth / 2, cropY + cropHeight)
        ctx.moveTo(cropX, cropY + cropHeight / 2)
        ctx.lineTo(cropX + cropWidth, cropY + cropHeight / 2)
        ctx.stroke()
        ctx.setLineDash([])

        ctx.fillStyle = "#3b82f6"
        ctx.font = `${isMobile ? "10px" : "11px"} sans-serif`
        ctx.fillText(`${cropWidth.toFixed(0)}×${cropHeight.toFixed(0)}px`, cropX, cropY - 5)
    }, [cropperState, imageLoaded])

    useEffect(() => {
        if (showCropper && imageLoaded) {
            drawCanvas()
        }
    }, [showCropper, imageLoaded, drawCanvas])

    useEffect(() => {
        const handleResize = () => {
            if (showCropper && imageLoaded) {
                drawCanvas()
            }
        }

        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [showCropper, imageLoaded, drawCanvas])

    const handleImageLoad = () => {
        setImageLoaded(true)
    }

    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDragging(true)
        setDragStart({ x: e.clientX, y: e.clientY })
    }

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging) return

        const deltaX = e.clientX - dragStart.x
        const deltaY = e.clientY - dragStart.y

        setCropperState((prev) => ({
            ...prev,
            x: prev.x + deltaX * 0.5,
            y: prev.y + deltaY * 0.5,
        }))

        setDragStart({ x: e.clientX, y: e.clientY })
    }

    const handleCanvasMouseUp = () => {
        setIsDragging(false)
    }

    const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault()

        const zoomIntensity = 0.1
        const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity
        const newScale = Math.max(0.1, Math.min(3, cropperState.scale + delta))

        setCropperState((prev) => ({ ...prev, scale: newScale }))
    }

    const updateScale = (value: number) => {
        setCropperState((prev) => ({ ...prev, scale: value }))
    }

    const rotateImage = () => {
        setCropperState((prev) => ({ ...prev, rotation: (prev.rotation + 90) % 360 }))
    }

    const resetCropper = () => {
        setCropperState({
            scale: 1,
            rotation: 0,
            x: 0,
            y: 0,
        })
    }

    const cropImage = () => {
        const canvas = canvasRef.current
        const img = imageRef.current

        if (!canvas || !img) return

        const cropCanvas = document.createElement("canvas")
        cropCanvas.width = 436
        cropCanvas.height = 196
        const cropCtx = cropCanvas.getContext("2d")
        if (!cropCtx) return

        cropCtx.imageSmoothingEnabled = true
        cropCtx.imageSmoothingQuality = "high"

        const tempCanvas = document.createElement("canvas")
        const scaleFactor = 2
        tempCanvas.width = canvas.width * scaleFactor
        tempCanvas.height = canvas.height * scaleFactor
        const tempCtx = tempCanvas.getContext("2d")
        if (!tempCtx) return

        tempCtx.imageSmoothingEnabled = true
        tempCtx.imageSmoothingQuality = "high"
        tempCtx.scale(scaleFactor, scaleFactor)

        const centerX = canvas.width / 2
        const centerY = canvas.height / 2

        tempCtx.save()
        tempCtx.translate(centerX + cropperState.x, centerY + cropperState.y)
        tempCtx.rotate((cropperState.rotation * Math.PI) / 180)
        tempCtx.scale(cropperState.scale, cropperState.scale)

        const imgAspect = img.naturalWidth / img.naturalHeight
        const containerAspect = canvas.width / canvas.height

        let drawWidth: number, drawHeight: number
        if (imgAspect > containerAspect) {
            drawWidth = canvas.width * 0.8
            drawHeight = drawWidth / imgAspect
        } else {
            drawHeight = canvas.height * 0.8
            drawWidth = drawHeight * imgAspect
        }

        tempCtx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
        tempCtx.restore()

        const isMobile = window.innerWidth < 640
        const cropWidth = Math.min(isMobile ? 280 : 350, canvas.width * 0.7) * scaleFactor
        const cropHeight = Math.min(cropWidth * (196 / 436), canvas.height * 0.6 * scaleFactor)
        const cropX = (tempCanvas.width - cropWidth) / 2
        const cropY = (tempCanvas.height - cropHeight) / 2

        cropCtx.drawImage(tempCanvas, cropX, cropY, cropWidth, cropHeight, 0, 0, 436, 196)

        cropCanvas.toBlob(
            (blob) => {
                if (blob) {
                    const croppedFile = new File([blob], "cropped-image.jpg", {
                        type: "image/jpeg",
                        lastModified: Date.now(),
                    })
                    setData("image", croppedFile)
                    setCroppedImage(cropCanvas.toDataURL("image/jpeg", 0.95))
                    setShowCropper(false)
                }
            },
            "image/jpeg",
            0.95,
        )
    }

    const addSuggestedAmount = () => {
        if (newSuggestedAmount && !data.suggested_amounts.includes(newSuggestedAmount)) {
            setData(
                "suggested_amounts",
                [...data.suggested_amounts, newSuggestedAmount].sort((a, b) => Number(a) - Number(b)),
            )
            setNewSuggestedAmount("")
        }
    }

    const removeSuggestedAmount = (amount: string) => {
        setData(
            "suggested_amounts",
            data.suggested_amounts.filter((a: string) => a !== amount),
        )
    }

    const removeImage = () => {
        setData("image", null)
        setCroppedImage(null)
        setOriginalImage(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    return (
        <AppLayout>
            <Head title={`Edit NodeBoss - ${nodeBoss.name}`} />

            <div className="space-y-6 m-10">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href={route("node-boss.index")}>
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-xl">
                            <Edit className="h-5 w-5 sm:h-7 sm:w-7 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">Edit Node Boss</h1>
                            <p className="text-muted-foreground">Launch a new investment opportunity</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">NodeBoss Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            {/* Basic Information */}
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Basic Information</h3>

                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <label htmlFor="name" className="text-sm font-semibold text-foreground">
                                            NodeBoss Name *
                                        </label>
                                        <Input
                                            id="name"
                                            type="text"
                                            value={data.name}
                                            onChange={(e) => setData("name", e.target.value)}
                                            placeholder="Enter NodeBoss name"
                                            className={errors.name ? "border-destructive" : ""}
                                        />
                                        {errors.name && (
                                            <p className="text-sm text-destructive flex items-center gap-1">
                                                <X className="h-3 w-3" />
                                                {errors.name}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="price" className="text-sm font-semibold text-foreground">
                                            Price *
                                        </label>
                                        <Input
                                            id="price"
                                            type="text"
                                            value={data.price}
                                            onChange={(e) => setData("price", e.target.value)}
                                            placeholder="Enter NodeBoss price"
                                            className={errors.price ? "border-destructive" : ""}
                                        />
                                        {errors.price && (
                                            <p className="text-sm text-destructive flex items-center gap-1">
                                                <X className="h-3 w-3" />
                                                {errors.name}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="description" className="text-sm font-semibold text-foreground">
                                            Description *
                                        </label>
                                        <Textarea
                                            id="description"
                                            value={data.description}
                                            onChange={(e) => setData("description", e.target.value)}
                                            placeholder="Describe your NodeBoss investment opportunity..."
                                            rows={5}
                                            className={errors.description ? "border-destructive" : ""}
                                        />
                                        {errors.description && (
                                            <p className="text-sm text-destructive flex items-center gap-1">
                                                <X className="h-3 w-3" />
                                                {errors.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Suggested Amounts */}
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                                    Suggested Investment Amounts
                                </h3>

                                <div className="space-y-4">
                                    <div className="flex flex-wrap gap-2">
                                        {data.suggested_amounts.map((amount: string) => (
                                            <Badge key={amount} variant="secondary" className="px-3 py-2 text-sm flex items-center gap-2">
                                                ${amount}
                                                <button
                                                    type="button"
                                                    onClick={() => removeSuggestedAmount(amount)}
                                                    className="text-muted-foreground hover:text-foreground"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>

                                    <div className="flex gap-2 max-w-md">
                                        <Input
                                            type="number"
                                            min="1"
                                            value={newSuggestedAmount}
                                            onChange={(e) => setNewSuggestedAmount(e.target.value)}
                                            placeholder="Add amount"
                                        />
                                        <Button type="button" onClick={addSuggestedAmount} variant="outline" size="sm">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                {errors.suggested_amounts && <p className="text-sm text-destructive">{errors.suggested_amounts}</p>}
                            </div>

                            {/* Image Upload */}
                            {/* <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                                    NodeBoss Image (436x196 pixels) *
                                </h3>

                                <div className="space-y-4">
                                    {(!data.image && !croppedImage) ? (
                                        <div
                                            className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${dragActive ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                                                }`}
                                            onDragEnter={handleDrag}
                                            onDragLeave={handleDrag}
                                            onDragOver={handleDrag}
                                            onDrop={handleDrop}
                                        >
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <div className="space-y-4">
                                                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                                                    <Upload className="h-8 w-8 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="text-lg font-medium text-foreground">
                                                        Drop your image here, or <span className="text-primary">browse</span>
                                                    </p>
                                                    <p className="text-sm text-muted-foreground mt-2">
                                                        PNG, JPG, GIF - Professional cropper will resize to 436x196 pixels
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex justify-center">
                                                <div
                                                    className="relative bg-muted rounded-xl overflow-hidden border-2 border-border shadow-lg"
                                                    style={{ width: "436px", height: "196px" }}
                                                >
                                                    {croppedImage && (
                                                        <img
                                                            src={croppedImage || "/placeholder.svg"}
                                                            alt="Cropped preview"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={removeImage}
                                                        className="absolute top-2 right-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full w-8 h-8 flex items-center justify-center"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex justify-center">
                                                <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                                                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                                                        <ImageIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-green-800 dark:text-green-200">Image ready!</p>
                                                        <p className="text-xs text-green-600 dark:text-green-400">436×196 pixels ✓</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {errors.image && (
                                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                                            <p className="text-sm text-destructive flex items-center gap-2">
                                                <X className="h-4 w-4" />
                                                {errors.image}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div> */}

                            {/* Settings */}
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Settings</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label htmlFor="status" className="text-sm font-semibold text-foreground">
                                            Status
                                        </label>
                                        <Select id="status" value={data.status} onChange={(e) => setData("status", e.target.value as "active" | "inactive" | "draft")}>
                                            <option value="active">🟢 Active</option>
                                            <option value="inactive">🟡 Inactive</option>
                                            <option value="draft">📝 Draft</option>
                                        </Select>
                                        {errors.status && <div className="text-sm text-destructive">{errors.status}</div>}
                                    </div>
                                    <div className="flex items-center justify-between px-6 bg-muted/50 rounded-xl border">
                                        <div className="space-y-1">
                                            <label htmlFor="is_closed" className="text-sm font-semibold text-foreground">
                                                Closed for Investment
                                            </label>
                                            <p className="text-xs text-muted-foreground">Prevent new investments</p>
                                        </div>
                                        <Switch
                                            id="is_closed"
                                            checked={data.is_closed}
                                            onCheckedChange={(checked) => setData("is_closed", checked)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="pt-6 border-t border-border">
                                <div className="flex flex-col sm:flex-row gap-4 justify-end">
                                    <Link href={route("node-boss.index")}>
                                        <Button type="button" variant="outline" className="w-full sm:w-auto bg-transparent">
                                            Cancel
                                        </Button>
                                    </Link>
                                    <Button type="submit" disabled={processing} className="w-full sm:w-auto min-w-[160px] cursor-pointer">
                                        {processing ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                                                Updating...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-5 w-5" />
                                                Update
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </form>

                {/* Mobile-Optimized Image Cropper */}
                <Dialog open={showCropper} onOpenChange={setShowCropper}>
                    <DialogContent className="w-[95vw] sm:w-[600px] max-w-2xl h-[85vh] sm:h-auto max-h-[85vh] p-0 overflow-hidden flex flex-col">
                        <DialogHeader className="p-3 pb-2 border-b flex-shrink-0">
                            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                                <Crop className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                Image Cropper
                                <span className="text-xs sm:text-sm font-normal text-muted-foreground">436×196px</span>
                            </DialogTitle>
                        </DialogHeader>

                        <div className="flex-1 flex flex-col p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-hidden">
                            {/* Compact Controls */}
                            <div className="grid grid-cols-3 gap-2 sm:gap-3 p-2 sm:p-3 bg-muted/50 rounded-lg flex-shrink-0">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Scale</label>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="3"
                                        step="0.1"
                                        value={cropperState.scale}
                                        onChange={(e) => updateScale(Number.parseFloat(e.target.value))}
                                        className="w-full"
                                    />
                                    <div className="text-xs text-center text-muted-foreground">{cropperState.scale.toFixed(1)}x</div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Rotate</label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={rotateImage}
                                        className="w-full h-6 sm:h-7 text-xs bg-transparent"
                                    >
                                        <RotateCw className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                                        90°
                                    </Button>
                                    <div className="text-xs text-center text-muted-foreground">{cropperState.rotation}°</div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Reset</label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={resetCropper}
                                        className="w-full h-6 sm:h-7 text-xs bg-transparent"
                                    >
                                        <RefreshCw className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                                        Reset
                                    </Button>
                                    <div className="text-xs text-center text-muted-foreground">
                                        {cropperState.x.toFixed(0)}, {cropperState.y.toFixed(0)}
                                    </div>
                                </div>
                            </div>

                            {/* Responsive Canvas Container */}
                            <div
                                className="flex-1 flex justify-center bg-background rounded-lg border p-1 sm:p-2 overflow-hidden"
                                ref={containerRef}
                                style={{ minHeight: "200px", maxHeight: "400px" }}
                            >
                                <div className="relative w-full h-full flex justify-center items-center">
                                    <canvas
                                        ref={canvasRef}
                                        className="max-w-full max-h-full cursor-move shadow-sm rounded"
                                        onMouseDown={handleCanvasMouseDown}
                                        onMouseMove={handleCanvasMouseMove}
                                        onMouseUp={handleCanvasMouseUp}
                                        onMouseLeave={handleCanvasMouseUp}
                                        onWheel={handleCanvasWheel}
                                    />

                                    {/* Hidden image for loading */}
                                    {originalImage && (
                                        <img
                                            ref={imageRef}
                                            src={originalImage || "/placeholder.svg"}
                                            onLoad={handleImageLoad}
                                            className="hidden"
                                            alt="Original"
                                        />
                                    )}

                                    {!imageLoaded && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded">
                                            <div className="text-center">
                                                <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-primary mx-auto mb-2"></div>
                                                <p className="text-xs text-muted-foreground">Loading...</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Compact Instructions */}
                            <div className="text-center text-xs text-muted-foreground bg-primary/5 p-2 rounded flex-shrink-0">
                                <Move3D className="h-3 w-3 inline mr-1" />
                                Drag • Scroll to zoom • Use controls above
                            </div>

                            {/* Always Visible Action Buttons */}
                            <div className="flex justify-end gap-2 pt-2 border-t border-border flex-shrink-0">
                                <Button type="button" variant="outline" size="sm" onClick={() => setShowCropper(false)}>
                                    Cancel
                                </Button>
                                <Button type="button" size="sm" onClick={cropImage} disabled={!imageLoaded}>
                                    <Check className="mr-1 h-3 w-3" />
                                    Apply
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    )
}
