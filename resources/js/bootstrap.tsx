// resources/js/bootstrap.ts

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Make Pusher available globally for Echo
window.Pusher = Pusher;

// Initialize Laravel Echo
window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
    // Add auth endpoint for private/presence channels
    authEndpoint: '/broadcasting/auth',
    auth: {
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
        },
    },
});

// Optional: Listen for connection status
window.Echo.connector.pusher.connection.bind('connected', () => {
    console.log('Laravel Echo connected to Reverb!');
});

window.Echo.connector.pusher.connection.bind('disconnected', () => {
    console.log('Laravel Echo disconnected from Reverb.');
});

window.Echo.connector.pusher.connection.bind('error', (err: any) => {
    console.error('Laravel Echo connection error:', err);
});

// You can also set up global listeners here if needed
// For example, to listen for user online/offline status
// window.Echo.join('online-users')
//     .here((users: any[]) => {
//         console.log('Online users:', users);
//     })
//     .joining((user: any) => {
//         console.log(user.name, 'joined online');
//     })
//     .leaving((user: any) => {
//         console.log(user.name, 'left online');
//     });
