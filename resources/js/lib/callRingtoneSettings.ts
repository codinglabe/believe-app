export type CallRingtoneMode = "default" | "custom"

const MODE_KEY = "unity_call_ringtone_mode"
const DB_NAME = "unity_call_ringtone"
const STORE_NAME = "files"
const FILE_KEY = "custom"

export function getCallRingtoneMode(): CallRingtoneMode {
  if (typeof localStorage === "undefined") {
    return "default"
  }
  return localStorage.getItem(MODE_KEY) === "custom" ? "custom" : "default"
}

export function setCallRingtoneMode(mode: CallRingtoneMode): void {
  if (typeof localStorage === "undefined") {
    return
  }
  localStorage.setItem(MODE_KEY, mode)
}

function openRingtoneDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

export async function saveCustomCallRingtone(file: File): Promise<void> {
  const db = await openRingtoneDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.objectStore(STORE_NAME).put(file, FILE_KEY)
  })
  setCallRingtoneMode("custom")
}

export async function clearCustomCallRingtone(): Promise<void> {
  const db = await openRingtoneDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.objectStore(STORE_NAME).delete(FILE_KEY)
  })
  setCallRingtoneMode("default")
}

export async function loadCustomCallRingtoneBlob(): Promise<Blob | null> {
  try {
    const db = await openRingtoneDb()
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly")
      tx.onerror = () => reject(tx.error)
      const request = tx.objectStore(STORE_NAME).get(FILE_KEY)
      request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null)
      request.onerror = () => reject(request.error)
    })
  } catch {
    return null
  }
}
