import toast from "react-hot-toast"

interface ToastData {
    success: boolean
    message: string
    type?: "success" | "error" | "info" | "warning"
}

export const showToast = (toastData: ToastData) => {
    const { success, message, type } = toastData

    if (success) {
        switch (type) {
            case "success":
                toast.success(message, {
                    duration: 4000,
                    position: "top-right",
                })
                break
            case "info":
                toast(message, {
                    duration: 4000,
                    position: "top-right",
                    icon: "ℹ️",
                })
                break
            default:
                toast.success(message, {
                    duration: 4000,
                    position: "top-right",
                })
        }
    } else {
        switch (type) {
            case "warning":
                toast(message, {
                    duration: 5000,
                    position: "top-right",
                    icon: "⚠️",
                    style: {
                        background: "#f59e0b",
                        color: "#fff",
                    },
                })
                break
            case "error":
            default:
                toast.error(message, {
                    duration: 5000,
                    position: "top-right",
                })
        }
    }
}

export const showSuccessToast = (message: string) => {
    toast.success(message, {
        duration: 4000,
        position: "top-right",
    })
}

export const showErrorToast = (message: string) => {
    toast.error(message, {
        duration: 5000,
        position: "top-right",
    })
}

export const showInfoToast = (message: string) => {
    toast(message, {
        duration: 4000,
        position: "top-right",
        icon: "ℹ️",
    })
}

export const showWarningToast = (message: string) => {
    toast(message, {
        duration: 5000,
        position: "top-right",
        icon: "⚠️",
        style: {
            background: "#f59e0b",
            color: "#fff",
        },
    })
}
