import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NotificationData } from '@/types';
import echo from '@/lib/echo';

interface NotificationContextType {
    notifications: NotificationData[];
    unreadCount: number;
    addNotification: (notification: NotificationData) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

interface NotificationProviderProps {
    children: ReactNode;
    user: any;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children, user }) => {
    const [notifications, setNotifications] = useState<NotificationData[]>([]);

    useEffect(() => {
        if (!user) return;

        // Listen for daily prayer notifications
        echo.private(`users.${user.id}`)
            .listen('.daily.prayer.received', (e: any) => {
                const notification: NotificationData = {
                    id: e.id,
                    type: e.type,
                    data: e.data,
                    read_at: null,
                    created_at: e.data.created_at,
                };
                addNotification(notification);

                // Play notification sound
                playNotificationSound();
            });

        // Cleanup on unmount
        return () => {
            echo.private(`users.${user.id}`).stopListening('.daily.prayer.received');
        };
    }, [user]);

    const playNotificationSound = () => {
        const audio = new Audio('/sounds/notification.mp3');
        audio.play().catch(() => {
            // Silent fail if audio can't play
        });
    };

    const addNotification = (notification: NotificationData) => {
        setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
    };

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(notif =>
                notif.id === id ? { ...notif, read_at: new Date().toISOString() } : notif
            )
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev =>
            prev.map(notif => ({ ...notif, read_at: new Date().toISOString() }))
        );
    };

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(notif => notif.id !== id));
    };

    const unreadCount = notifications.filter(notif => !notif.read_at).length;

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            addNotification,
            markAsRead,
            markAllAsRead,
            removeNotification,
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
