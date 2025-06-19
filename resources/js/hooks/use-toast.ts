"use client"

import { useEffect } from "react"
import { usePage } from "@inertiajs/react"
import { showToast } from "@/lib/toast"

interface ToastData {
    success: boolean
    message: string
    type?: "success" | "error" | "info" | "warning"
    deleted_count?: number
}

interface PageProps {
    toast?: ToastData
    [key: string]: any
}

export const useToast = () => {
    const { props } = usePage<PageProps>()

    useEffect(() => {
        if (props.toast) {
            showToast(props.toast)
        }
    }, [props.toast])
}
