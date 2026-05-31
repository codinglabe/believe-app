import { removeCurrentDevicePushToken } from "@/lib/push-token-sync";

/**
 * Call before Inertia logout navigation to unregister this device's FCM token.
 */
export async function prepareLogout(): Promise<void> {
    await removeCurrentDevicePushToken();
}
