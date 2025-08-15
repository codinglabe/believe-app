import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
console.log('CSRF Tokensss:', csrfToken); // Debug token

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY || 'fallback_key',
    wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
    wsPort: import.meta.env.VITE_REVERB_PORT || 8080,
    forceTLS: false, // Disable for local testing
    enabledTransports: ['ws', 'wss'],
    authEndpoint: '/broadcasting/auth',
    withCredentials: true,
    auth: {
        headers: {
            'X-CSRF-TOKEN': csrfToken,
        },
    },

});
