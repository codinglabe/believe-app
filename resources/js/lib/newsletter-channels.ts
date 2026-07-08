/** SMS engagement is disabled until Twilio production setup is complete. */
export const NEWSLETTER_SMS_ENABLED = false

export function isNewsletterSmsSendVia(sendVia: string | undefined | null): boolean {
    return sendVia === "sms" || sendVia === "both"
}
