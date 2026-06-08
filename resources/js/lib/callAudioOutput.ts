type AudioElementWithSink = HTMLAudioElement & {
  setSinkId?: (sinkId: string) => Promise<void>
  sinkId?: string
}

type ResolvedOutputs = {
  speakerId: string
  earpieceId: string | null
  distinct: boolean
}

const EARPIECE_LABEL = /earpiece|receiver|handset|phone/i
const SPEAKER_LABEL = /speaker|speakerphone|loud|external/i
const BUILT_IN_SPEAKER_LABEL = /built-in speaker|built-in output/i

let outputCache: ResolvedOutputs | null = null

function listenForAudioDeviceChanges(): void {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.addEventListener) {
    return
  }

  navigator.mediaDevices.addEventListener("devicechange", () => {
    outputCache = null
  })
}

if (typeof navigator !== "undefined") {
  listenForAudioDeviceChanges()
}

export function invalidateAudioOutputCache(): void {
  outputCache = null
}

export function supportsAudioOutputSelection(): boolean {
  if (typeof HTMLAudioElement === "undefined") {
    return false
  }

  return typeof (HTMLAudioElement.prototype as AudioElementWithSink).setSinkId === "function"
}

async function listAudioOutputs(): Promise<MediaDeviceInfo[]> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return []
  }

  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter((device) => device.kind === "audiooutput" && device.deviceId !== "")
}

async function resolveOutputDevices(): Promise<ResolvedOutputs> {
  if (outputCache) {
    return outputCache
  }

  const outputs = await listAudioOutputs()

  if (outputs.length === 0) {
    outputCache = { speakerId: "default", earpieceId: null, distinct: false }
    return outputCache
  }

  if (outputs.length === 1) {
    outputCache = {
      speakerId: outputs[0].deviceId,
      earpieceId: null,
      distinct: false,
    }
    return outputCache
  }

  const labelEarpiece = outputs.find((device) => EARPIECE_LABEL.test(device.label))
  const labelSpeaker = outputs.find(
    (device) =>
      (SPEAKER_LABEL.test(device.label) || BUILT_IN_SPEAKER_LABEL.test(device.label)) &&
      !EARPIECE_LABEL.test(device.label),
  )

  let earpieceId = labelEarpiece?.deviceId ?? null
  let speakerId = labelSpeaker?.deviceId ?? null

  if (!earpieceId || !speakerId || earpieceId === speakerId) {
    earpieceId = outputs[0]?.deviceId ?? null
    speakerId = outputs[outputs.length - 1]?.deviceId ?? "default"
  }

  outputCache = {
    speakerId,
    earpieceId,
    distinct: Boolean(earpieceId && speakerId && earpieceId !== speakerId),
  }

  return outputCache
}

async function setElementSinkId(audio: HTMLAudioElement, sinkId: string): Promise<boolean> {
  const setSinkId = (audio as AudioElementWithSink).setSinkId
  if (!setSinkId) {
    return false
  }

  const current = (audio as AudioElementWithSink).sinkId
  if (current === sinkId) {
    return true
  }

  try {
    await setSinkId.call(audio, sinkId)
    return true
  } catch {
    return false
  }
}

export async function applyRemoteAudioOutput(
  audio: HTMLAudioElement,
  speakerOn: boolean,
): Promise<void> {
  audio.muted = false

  const { speakerId, earpieceId, distinct } = await resolveOutputDevices()
  const targetSinkId = speakerOn ? speakerId : (earpieceId ?? speakerId)

  if (supportsAudioOutputSelection()) {
    const routed = await setElementSinkId(audio, targetSinkId)
    if (!routed) {
      await setElementSinkId(audio, "default")
    }
  }

  if (distinct) {
    audio.volume = 1
  } else {
    audio.volume = speakerOn ? 1 : 0.55
  }

  await audio.play().catch(() => {})
}
