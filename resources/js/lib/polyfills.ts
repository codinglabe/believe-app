const UUID_TEMPLATE = "10000000-1000-4000-8000-100000000000"

function fallbackRandomUUID() {
  const cryptoObject = globalThis.crypto

  if (!cryptoObject?.getRandomValues) {
    return `fallback-${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  return UUID_TEMPLATE.replace(/[018]/g, (char) => {
    const randomBytes = cryptoObject.getRandomValues(new Uint8Array(1))
    const randomValue = randomBytes[0]
    const nextValue = Number(char) ^ (randomValue & (15 >> (Number(char) / 4)))

    return nextValue.toString(16)
  })
}

if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID !== "function") {
  globalThis.crypto.randomUUID = fallbackRandomUUID
}
