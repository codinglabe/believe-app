const DB_NAME = "unity-call"
const STORE_NAME = "pending"
const RECORD_KEY = "incoming"
const TTL_MS = 120_000

type PendingCallRecord = {
  data: Record<string, string | undefined>
  storedAt: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onerror = () => reject(request.error)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
  })
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        const store = tx.objectStore(STORE_NAME)
        const request = fn(store)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
        tx.onerror = () => reject(tx.error)
      }),
  )
}

export async function storePendingIncomingCallPersistent(
  data: Record<string, string | undefined>,
): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return
  }

  const record: PendingCallRecord = {
    data,
    storedAt: Date.now(),
  }

  await runTransaction("readwrite", (store) => store.put(record, RECORD_KEY))
}

export async function consumePendingIncomingCallPersistent(): Promise<Record<
  string,
  string | undefined
> | null> {
  if (typeof indexedDB === "undefined") {
    return null
  }

  try {
    const record = await runTransaction<PendingCallRecord | undefined>("readonly", (store) =>
      store.get(RECORD_KEY),
    )

    await runTransaction("readwrite", (store) => store.delete(RECORD_KEY))

    if (!record?.data || Date.now() - record.storedAt > TTL_MS) {
      return null
    }

    return record.data
  } catch {
    return null
  }
}

export async function clearPendingIncomingCallPersistent(): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return
  }

  try {
    await runTransaction("readwrite", (store) => store.delete(RECORD_KEY))
  } catch {
    // ignore
  }
}
