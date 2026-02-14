/**
 * OBS WebSocket + VDO.Ninja: connect to OBS, set YouTube stream, add browser source with view URL, start/stop stream.
 * Requires OBS 27.2+ with WebSocket server enabled (Tools → WebSocket Server Settings). Default port 4455.
 */

import OBSWebSocket from "obs-websocket-js"

const BROWSER_SOURCE_NAME = "VDO Ninja View"
const SCREEN_CAPTURE_NAME = "My Screen"
const DEDICATED_SCENE_NAME = "Believe Livestream"
const DEFAULT_URL = "ws://127.0.0.1:4455"

/** Input kind for full display/screen capture. Windows: monitor_capture; macOS: display_capture. */
const SCREEN_CAPTURE_KINDS = ["monitor_capture", "display_capture"]

export type OBSLivestreamConfig = {
  /** OBS WebSocket URL (e.g. ws://127.0.0.1:4455) */
  obsUrl?: string
  /** OBS WebSocket password if set */
  obsPassword?: string
  /** YouTube RTMP server URL (e.g. rtmp://a.rtmp.youtube.com/live2) */
  rtmpServer: string
  /** YouTube stream key */
  streamKey: string
  /** VDO.Ninja view URL for OBS browser source */
  viewUrl: string
}

export type OBSConnectionState = "disconnected" | "connecting" | "connected" | "error"

let obs: InstanceType<typeof OBSWebSocket> | null = null

/**
 * Connect to OBS and return the client (or throw).
 */
export async function connectOBS(url: string = DEFAULT_URL, password?: string): Promise<InstanceType<typeof OBSWebSocket>> {
  const client = new OBSWebSocket()
  await client.connect(url, password)
  return client
}

/** Delay helper (browser source needs time to load VDO.Ninja/WebRTC). */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Configure OBS for this livestream and start streaming to YouTube.
 * 1. Set stream service (YouTube RTMP + key)
 * 2. Get current scene and add/update browser source with VDO.Ninja view URL
 * 3. Refresh browser source and wait for it to load
 * 4. Start stream
 * Then call your backend to transition YouTube to live.
 */
export async function startOBSStream(config: OBSLivestreamConfig): Promise<void> {
  const url = config.obsUrl || DEFAULT_URL
  const client = await connectOBS(url, config.obsPassword)
  obs = client

  const browserSettings = {
    url: config.viewUrl,
    width: 1920,
    height: 1080,
    // Keep source loaded when scene is not active (VDO.Ninja + OBS recommendation)
    shutdown_source_when_not_shown: false,
  }

  try {
    // 1. Set stream service to YouTube (custom RTMP)
    await client.call("SetStreamServiceSettings", {
      streamServiceType: "rtmp_custom",
      streamServiceSettings: {
        server: config.rtmpServer,
        key: config.streamKey,
      },
    })

    // 2. Use a dedicated scene so the feed is the only visible source (nothing covering it)
    let sceneName = DEDICATED_SCENE_NAME
    try {
      await client.call("CreateScene", { sceneName })
    } catch {
      // Scene already exists
    }

    // 3. Create or update browser source in the dedicated scene
    let sceneItemId: number | null = null
    try {
      const createResp = await client.call("CreateInput", {
        sceneName,
        inputName: BROWSER_SOURCE_NAME,
        inputKind: "browser_source",
        inputSettings: browserSettings,
        sceneItemEnabled: true,
      }) as { sceneItemId?: number }
      sceneItemId = createResp?.sceneItemId ?? null
    } catch (createErr: unknown) {
      const errMsg = createErr instanceof Error ? createErr.message : String(createErr)
      if (errMsg.includes("already exists") || errMsg.includes("Resource")) {
        await client.call("SetInputSettings", {
          inputName: BROWSER_SOURCE_NAME,
          inputSettings: browserSettings,
        })
        // Input exists globally; ensure it's in our dedicated scene so we can show it
        const listResp = await client.call("GetSceneItemList", { sceneName }) as { sceneItems?: { sceneItemId: number; sourceName?: string; inputName?: string }[] }
        const item = listResp?.sceneItems?.find((i) => (i.sourceName ?? i.inputName) === BROWSER_SOURCE_NAME)
        if (item != null) {
          sceneItemId = item.sceneItemId
        } else {
          // Add existing input to our scene
          const addResp = await client.call("CreateSceneItem", {
            sceneName,
            sourceName: BROWSER_SOURCE_NAME,
          }) as { sceneItemId?: number }
          sceneItemId = addResp?.sceneItemId ?? null
        }
      } else {
        throw createErr
      }
    }

    // 4. Make the browser source fill the canvas (scale to fit 1920x1080)
    if (sceneItemId != null) {
      try {
        await client.call("SetSceneItemTransform", {
          sceneName,
          sceneItemId,
          sceneItemTransform: {
            boundsType: 2, // OBS_BOUNDS_SCALE_INNER
            boundsWidth: 1920,
            boundsHeight: 1080,
            boundsAlignment: 0,
          },
        })
      } catch {
        // Some OBS versions ignore bounds; source may still be visible
      }
    }

    // 5. Add Screen/Display Capture so the stream shows your meeting or desktop (primary display only)
    const screenInputSettings: Record<string, unknown> = {
      capture_cursor: true,
    }
    let screenSceneItemId: number | null = null
    for (const inputKind of SCREEN_CAPTURE_KINDS) {
      try {
        const screenResp = await client.call("CreateInput", {
          sceneName,
          inputName: SCREEN_CAPTURE_NAME,
          inputKind,
          inputSettings: screenInputSettings,
          sceneItemEnabled: true,
        }) as { sceneItemId?: number }
        screenSceneItemId = screenResp?.sceneItemId ?? null
        break
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes("already exists") || msg.includes("Resource")) {
          const listResp = await client.call("GetSceneItemList", { sceneName }) as { sceneItems?: { sceneItemId: number; sourceName?: string; inputName?: string }[] }
          const screenItem = listResp?.sceneItems?.find((i) => (i.sourceName ?? i.inputName) === SCREEN_CAPTURE_NAME)
          if (screenItem != null) {
            screenSceneItemId = screenItem.sceneItemId
          } else {
            try {
              const addResp = await client.call("CreateSceneItem", { sceneName, sourceName: SCREEN_CAPTURE_NAME }) as { sceneItemId?: number }
              screenSceneItemId = addResp?.sceneItemId ?? null
            } catch {
              // ignore
            }
          }
          break
        }
        // Wrong kind or other error; try next
      }
    }
    if (screenSceneItemId != null) {
      try {
        await client.call("SetSceneItemTransform", {
          sceneName,
          sceneItemId: screenSceneItemId,
          sceneItemTransform: {
            boundsType: 2,
            boundsWidth: 1920,
            boundsHeight: 1080,
            boundsAlignment: 0,
          },
        })
      } catch {
        // ignore
      }
    }

    // 6. Switch to our scene so it's what's streaming
    await client.call("SetCurrentProgramScene", { sceneName })

    // 8. Refresh browser source so the page loads (VDO.Ninja view)
    try {
      await client.call("PressInputPropertiesButton", {
        inputName: BROWSER_SOURCE_NAME,
        propertyName: "refreshnocache",
      })
    } catch {
      // Some OBS versions may use a different button name; ignore
    }

    // 9. Short wait then start streaming (screen capture is already visible)
    await delay(2000)

    // 10. Start streaming
    await client.call("StartStream")
  } catch (e) {
    obs = null
    await client.disconnect().catch(() => {})
    throw e
  }
}

/**
 * Stop the stream and optionally disconnect from OBS.
 */
export async function stopOBSStream(disconnect: boolean = false): Promise<void> {
  if (!obs) return
  try {
    await obs.call("StopStream")
  } catch (_) {
    // ignore
  }
  if (disconnect) {
    await obs.disconnect().catch(() => {})
    obs = null
  }
}

/**
 * Disconnect from OBS without stopping the stream.
 */
export async function disconnectOBS(): Promise<void> {
  if (obs) {
    await obs.disconnect().catch(() => {})
    obs = null
  }
}

/**
 * Check if OBS is reachable at the given URL (quick connect/disconnect).
 */
export async function checkOBSReachable(url: string = DEFAULT_URL, password?: string): Promise<boolean> {
  try {
    const client = await connectOBS(url, password)
    await client.disconnect()
    return true
  } catch {
    return false
  }
}
