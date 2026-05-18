import Echo from 'laravel-echo';

import Pusher from 'pusher-js';
window.Pusher = Pusher;

const isLoopbackHost = (host?: string) =>
    Boolean(host && ['127.0.0.1', '0.0.0.0', 'localhost'].includes(host));

const getReverbHost = () => {
    const configuredHost = import.meta.env.VITE_REVERB_HOST;
    const runtimeHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

    if (isLoopbackHost(configuredHost) && !isLoopbackHost(runtimeHost)) {
        return runtimeHost;
    }

    return configuredHost || runtimeHost;
};

window.Echo = new Echo({
    broadcaster: "reverb",
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: getReverbHost(),
    wsPort: Number(import.meta.env.VITE_REVERB_PORT) || 80,
    wssPort: Number(import.meta.env.VITE_REVERB_PORT) || 443,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? "https") === "https",
    enabledTransports: ["ws", "wss"],
    auth: {
        headers: {
            Authorization: `Bearer ${document.querySelector('meta[name="auth-token"]')?.getAttribute("content")}`,
            "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
        },
    },
    authEndpoint: "/broadcasting/auth",
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
});
