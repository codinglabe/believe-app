"use client"

import { useEffect } from "react"
import { usePage } from "@inertiajs/react"
import { showToast } from "@/lib/toast"

interface FlashMessage {
    success: boolean
    message: string
    type?: "success" | "error" | "info" | "warning"
}

interface PageProps {
    flash?: FlashMessage
    [key: string]: any
}

export const useFlashMessage = () => {
    const { props } = usePage<PageProps>()

    useEffect(() => {
        const flash = props.flash
        const message = flash?.message
        if (flash && typeof message === 'string' && message.trim() !== '') {
            showToast(flash)
        }
    }, [props.flash])
}
