/**
 * Record a push notification open for centralized tracking.
 */
export async function trackPushNotificationOpen(
  notificationLogId: string | number | undefined,
  recipientId: string | number | undefined,
): Promise<void> {
  if (!notificationLogId || !recipientId) {
    return;
  }

  try {
    await fetch("/api/push-notifications/open", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        notification_log_id: Number(notificationLogId),
        recipient_id: Number(recipientId),
      }),
    });
  } catch (error) {
    console.warn("[Push] Failed to record notification open", error);
  }
}
