import { ensureMessagingReady, requestFcmToken } from "@/lib/firebase";
import { isPushCapableBrowser } from "@/lib/push-environment";

const DEVICE_ID_KEY = "device_id";

export function getWebPushDeviceInfo() {
    const nav = navigator as Navigator & {
        userAgentData?: { brands?: Array<{ brand?: string }> };
    };
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
        deviceId = `device_${Math.random().toString(36).slice(2, 11)}`;
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return {
        device_id: deviceId,
        device_type: "web" as const,
        device_name: navigator.userAgent,
        browser: nav.userAgentData?.brands?.[0]?.brand || "Unknown",
        platform: navigator.platform,
        user_agent: navigator.userAgent,
    };
}

async function postPushTokenToServer(token: string): Promise<void> {
    const csrf =
        document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";

    const response = await fetch("/push-token", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-CSRF-TOKEN": csrf,
            "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "same-origin",
        body: JSON.stringify({
            token,
            device_info: getWebPushDeviceInfo(),
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Push token save failed (${response.status}): ${text}`);
    }
}

/**
 * Register FCM with Firebase (after SW is ready) and persist the token for the logged-in user.
 */
export async function syncPushTokenWithServer(options?: { prompt?: boolean }): Promise<string | null> {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
        console.warn("[Push] Service workers not supported");
        return null;
    }

    if (!isPushCapableBrowser()) {
        console.warn("[Push] Use http://127.0.0.1:8000 or http://localhost:8000 for local testing");
        return null;
    }

    const ready = await ensureMessagingReady();
    if (!ready) {
        console.warn("[Push] Messaging not ready — check service worker and HTTPS");
        return null;
    }

    const shouldPrompt = options?.prompt ?? Notification.permission === "default";
    const fcmToken = await requestFcmToken({ prompt: shouldPrompt });
    if (!fcmToken) {
        if (Notification.permission === "default" && !shouldPrompt) {
            console.info("[Push] Allow notifications in browser settings, or call syncPushTokenWithServer({ prompt: true })");
        }
        return null;
    }

    await postPushTokenToServer(fcmToken);
    console.info("[Push] Token saved to server");

    return fcmToken;
}
