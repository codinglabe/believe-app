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
        if (props.flash) {
            showToast(props.flash)
        }
    }, [props.flash])
}
