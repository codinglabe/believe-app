import {
    activateForegroundMessaging,
    ensureMessagingReady,
    requestFcmToken,
    resetMessagingRegistration,
} from "@/lib/firebase";
import { isPushCapableBrowser } from "@/lib/push-environment";

const DEVICE_ID_KEY = "device_id";
let syncInFlight: Promise<string | null> | null = null;

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
    if (syncInFlight) {
        return syncInFlight;
    }

    syncInFlight = (async () => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
            console.warn("[Push] Service workers not supported");
            return null;
        }

        if (!isPushCapableBrowser()) {
            console.warn("[Push] Use http://127.0.0.1:8000 or http://localhost:8000 for local testing");
            return null;
        }

        if (Notification.permission === "denied") {
            return null;
        }

        const shouldPrompt = options?.prompt ?? false;

        if (Notification.permission === "default" && !shouldPrompt) {
            console.info(
                "[Push] Notifications not enabled yet — allow in the browser or call enableBelievePush()",
            );
            return null;
        }

        if (Notification.permission === "default" && shouldPrompt) {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                return null;
            }
            resetMessagingRegistration();
        }

        const ready = await ensureMessagingReady();
        if (!ready) {
            console.warn("[Push] Messaging not ready — check service worker and HTTPS");
            return null;
        }

        const fcmToken = await requestFcmToken({ prompt: false });
        if (!fcmToken) {
            return null;
        }

        await postPushTokenToServer(fcmToken);
        await activateForegroundMessaging();
        console.info("[Push] Token saved to server — foreground listener ready");

        return fcmToken;
    })();

    try {
        return await syncInFlight;
    } finally {
        syncInFlight = null;
    }
}
