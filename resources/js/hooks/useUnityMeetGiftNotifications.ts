export type UnityMeetGiftPayload = {
  recipientId: number
  senderId: number
  senderName: string
  amount: number
  amountLabel: string
  occasion: string
  message?: string | null
  title?: string
  body?: string
}
