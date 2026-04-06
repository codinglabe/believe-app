export async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
        console.log("[PWA] Service Workers not supported")
        return
    }

    try {
        const registration = await navigator.serviceWorker.register("/service-worker.js", {
            scope: "/",
        })

        console.log("[PWA] Service Worker registered successfully:", registration)

        // Check for updates periodically
        setInterval(() => {
            registration.update()
        }, 60000) // Check every minute

        return registration
    } catch (error) {
        console.error("[PWA] Service Worker registration failed:", error)
    }
}

export function unregisterServiceWorker() {
    if (!("serviceWorker" in navigator)) return

    navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
            registration.unregister()
        })
    })
}
