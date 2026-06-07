type AudioElementWithSink = HTMLAudioElement & {
  setSinkId?: (sinkId: string) => Promise<void>
}

export function supportsAudioOutputSelection(): boolean {
  if (typeof HTMLAudioElement === "undefined") {
    return false
  }
  return typeof (HTMLAudioElement.prototype as AudioElementWithSink).setSinkId === "function"
}

async function pickSpeakerDeviceId(): Promise<string | null> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return null
  }

  const devices = await navigator.mediaDevices.enumerateDevices()
  const outputs = devices.filter((device) => device.kind === "audiooutput")
  if (outputs.length === 0) {
    return null
  }

  const speakerLike = outputs.find((device) =>
    /speaker|speakerphone|built-in|default/i.test(device.label),
  )

  return (speakerLike ?? outputs[outputs.length - 1])?.deviceId ?? null
}

async function pickEarpieceDeviceId(): Promise<string | null> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return null
  }

  const devices = await navigator.mediaDevices.enumerateDevices()
  const outputs = devices.filter((device) => device.kind === "audiooutput")
  const earpiece = outputs.find((device) => /earpiece|receiver|phone/i.test(device.label))
  return earpiece?.deviceId ?? null
}

export async function applyRemoteAudioOutput(
  audio: HTMLAudioElement,
  speakerOn: boolean,
): Promise<void> {
  const setSinkId = (audio as AudioElementWithSink).setSinkId
  if (!setSinkId) {
    await audio.play().catch(() => {})
    return
  }

  try {
    if (speakerOn) {
      const speakerId = await pickSpeakerDeviceId()
      if (speakerId) {
        await setSinkId.call(audio, speakerId)
      } else {
        await setSinkId.call(audio, "default")
      }
    } else {
      const earpieceId = await pickEarpieceDeviceId()
      if (earpieceId) {
        await setSinkId.call(audio, earpieceId)
      } else {
        await setSinkId.call(audio, "default")
      }
    }
  } catch {
    // Some browsers reject sink changes until after user gesture — still try playback.
  }

  await audio.play().catch(() => {})
}

export function attachWebAudioFallback(stream: MediaStream): () => void {
  if (supportsAudioOutputSelection()) {
    return () => {}
  }

  try {
    const context = new AudioContext()
    const source = context.createMediaStreamSource(stream)
    source.connect(context.destination)
    void context.resume()

    return () => {
      source.disconnect()
      void context.close()
    }
  } catch {
    return () => {}
  }
}
