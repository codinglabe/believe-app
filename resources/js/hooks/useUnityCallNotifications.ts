export type UnityCallParticipantRow = {
  userId: number
  name: string
  avatar?: string | null
  role: "caller" | "callee"
  status: string
}

export type UnityCallPayload = {
  id: number
  status: string
  type: string
  chatRoomId?: number | null
  chatRoomName?: string | null
  chatRoomType?: "direct" | "private" | "public" | null
  isGroupCall?: boolean
  joinUrl: string
  ringExpiresAt?: string | null
  answeredAt?: string | null
  endedAt?: string | null
}

export type UnityCallStatusEvent = {
  reason: string
  call: UnityCallPayload
  caller: {
    id: number
    name: string
    avatar?: string | null
  }
  participants: UnityCallParticipantRow[]
}
