type WebRTCSignalLike = {
  type: string
  from: string
  to: string
  offer?: RTCSessionDescriptionInit
  answer?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
}

/** Repair SDP line endings lost during JSON/cache relay (causes invalid msid lines). */
export function normalizeSdp(sdp: string): string {
  let text = sdp
    .replace(/\\n/g, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  return `${lines.join("\r\n")}\r\n`
}

export function normalizeSessionDescription(
  description: RTCSessionDescriptionInit | undefined | null,
): RTCSessionDescriptionInit | undefined {
  if (!description?.type) {
    return undefined
  }
  if (!description.sdp) {
    return { type: description.type }
  }
  return {
    type: description.type,
    sdp: normalizeSdp(description.sdp),
  }
}

export function normalizeWebRtcSignal<T extends WebRTCSignalLike>(signal: T): T {
  if (signal.offer) {
    return { ...signal, offer: normalizeSessionDescription(signal.offer) ?? signal.offer }
  }
  if (signal.answer) {
    return { ...signal, answer: normalizeSessionDescription(signal.answer) ?? signal.answer }
  }
  return signal
}

export function webRtcSignalKey(signal: WebRTCSignalLike): string {
  if (signal.type === "ice-candidate" && signal.candidate?.candidate) {
    return `ice:${signal.from}:${signal.to}:${signal.candidate.candidate}`
  }
  if (signal.type === "offer" && signal.offer?.sdp) {
    return `offer:${signal.from}:${signal.to}:${signal.offer.sdp.length}:${signal.offer.sdp.slice(-64)}`
  }
  if (signal.type === "answer" && signal.answer?.sdp) {
    return `answer:${signal.from}:${signal.to}:${signal.answer.sdp.length}:${signal.answer.sdp.slice(-64)}`
  }
  if (signal.type === "offer-request") {
    return `offer-request:${signal.from}:${signal.to}`
  }
  return `${signal.type}:${signal.from}:${signal.to}`
}

export function isPeerNegotiationSettled(pc: RTCPeerConnection): boolean {
  if (pc.connectionState === "connected" || pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
    return true
  }
  return pc.signalingState === "stable" && pc.currentRemoteDescription !== null && pc.currentLocalDescription !== null
}

const DEFAULT_STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:openrelay.metered.ca:80" },
]

const DEFAULT_TURN_SERVERS: RTCIceServer[] = [
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
]

function iceEntryUrls(entry: RTCIceServer): string[] {
  const urls = entry.urls
  if (!urls) {
    return []
  }
  return Array.isArray(urls) ? urls.map(String) : [String(urls)]
}

export function iceEntryHasTurn(entry: RTCIceServer): boolean {
  return iceEntryUrls(entry).some((url) => url.startsWith("turn:") || url.startsWith("turns:"))
}

/** STUN-only from the server cannot relay audio across NAT — ensure at least one TURN entry. */
export function ensureTurnIceServers(iceServers: RTCIceServer[]): RTCIceServer[] {
  const base = iceServers.length > 0 ? iceServers : DEFAULT_STUN_SERVERS
  if (base.some(iceEntryHasTurn)) {
    return base
  }
  return [...base, ...DEFAULT_TURN_SERVERS]
}

export function buildUnityCallRtcConfiguration(iceServers: RTCIceServer[]): RTCConfiguration {
  return {
    iceServers: ensureTurnIceServers(iceServers),
    iceCandidatePoolSize: 10,
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
  }
}
