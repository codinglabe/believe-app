import toast from "react-hot-toast";

export type FirebaseNotificationDetail = {
    title?: string;
    body?: string;
    data?: Record<string, string | undefined>;
};

export function resolvePushTitleBody(detail: FirebaseNotificationDetail): { title: string; body: string } {
    const data = detail.data ?? {};
    const title =
        (detail.title && String(detail.title).trim()) ||
        (data.title && String(data.title).trim()) ||
        "Believe In Unity";
    const body =
        (detail.body && String(detail.body).trim()) ||
        (data.body && String(data.body).trim()) ||
        (data.message && String(data.message).trim()) ||
        "";

    return { title, body };
}

const recentToastKeys = new Map<string, number>();
const TOAST_DEDUPE_MS = 5000;

/** In-app toast when a push arrives while the tab is open (foreground FCM). */
export function showFirebasePushToast(detail: FirebaseNotificationDetail): void {
    const { title, body } = resolvePushTitleBody(detail);
    const clickUrl = detail.data?.click_action || detail.data?.url;
    const message = body ? `${title}\n${body}` : title;

    const dedupeKey = `${detail.data?.type ?? "push"}:${detail.data?.livestream_id ?? detail.data?.source_id ?? title}`;
    const now = Date.now();
    const lastShown = recentToastKeys.get(dedupeKey);
    if (lastShown !== undefined && now - lastShown < TOAST_DEDUPE_MS) {
        return;
    }
    recentToastKeys.set(dedupeKey, now);

    toast(message, {
        duration: 6000,
        position: "bottom-right",
        style: {
            maxWidth: "22rem",
            whiteSpace: "pre-line",
        },
        ...(clickUrl
            ? {
                  onClick: () => {
                      window.location.href = clickUrl;
                  },
              }
            : {}),
    });
}

let listenerAttached = false;

/** Single global listener — safe to call multiple times. */
export function attachFirebasePushToastListener(): void {
    if (listenerAttached || typeof window === "undefined") {
        return;
    }
    listenerAttached = true;

    window.addEventListener("firebase-notification", (event: Event) => {
        const detail = (event as CustomEvent<FirebaseNotificationDetail>).detail;
        if (!detail) {
            return;
        }
        showFirebasePushToast(detail);
    });
}
