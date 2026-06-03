import {
    activateForegroundMessaging,
    ensureMessagingReady,
    requestFcmToken,
    resetMessagingRegistration,
} from "@/lib/firebase";
import { isPushCapableBrowser } from "@/lib/push-environment";

const DEVICE_ID_KEY = "device_id";
const LAST_SYNC_KEY = "push_token_last_sync";
const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // Re-sync every 6 hours

let syncInFlight: Promise<string | null> | null = null;
let refreshListenersStarted = false;

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
        if (response.status !== 401 && response.status !== 403) {
            localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
        }
        throw new Error(`Push token save failed (${response.status}): ${text}`);
    }

    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
}

/**
 * Remove the current device's push token from the server (call before logout).
 */
export async function removeCurrentDevicePushToken(): Promise<void> {
    if (typeof window === "undefined") {
        return;
    }

    const csrf =
        document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";

    try {
        await fetch("/push-token", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "X-CSRF-TOKEN": csrf,
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
            body: JSON.stringify({
                device_info: getWebPushDeviceInfo(),
            }),
            keepalive: true,
        });
    } catch (error) {
        console.warn("[Push] Failed to remove device token on logout:", error);
    }
}

function shouldForceRefresh(): boolean {
    const lastSync = localStorage.getItem(LAST_SYNC_KEY);
    if (!lastSync) {
        return true;
    }
    return Date.now() - Number(lastSync) > SYNC_INTERVAL_MS;
}

/**
 * Register FCM with Firebase (after SW is ready) and persist the token for the logged-in user.
 */
export async function syncPushTokenWithServer(options?: {
    prompt?: boolean;
    force?: boolean;
}): Promise<string | null> {
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
        const forceRefresh = options?.force ?? shouldForceRefresh();

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

        if (forceRefresh) {
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

/**
 * Periodically refresh the FCM token when the tab becomes visible or on focus.
 */
export function startPushTokenRefreshListeners(isLoggedIn: () => boolean): () => void {
    if (refreshListenersStarted || typeof window === "undefined") {
        return () => undefined;
    }
    refreshListenersStarted = true;

    const refresh = () => {
        if (!isLoggedIn() || Notification.permission !== "granted") {
            return;
        }
        void syncPushTokenWithServer({ force: shouldForceRefresh() });
    };

    const onVisible = () => {
        if (document.visibilityState === "visible") {
            refresh();
        }
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
        refreshListenersStarted = false;
        window.removeEventListener("focus", refresh);
        document.removeEventListener("visibilitychange", onVisible);
    };
}
