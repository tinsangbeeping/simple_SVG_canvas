function getStorage(): Storage | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function readString(key: string): string | null {
  const storage = getStorage()
  if (!storage) return null
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

export function writeString(key: string, value: string): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(key, value)
  } catch {
    // ignore
  }
}

export function removeKey(key: string): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(key)
  } catch {
    // ignore
  }
}

export function readJSON<T>(key: string, fallback: T): T {
  const stored = readString(key)
  if (!stored) return fallback
  try {
    return JSON.parse(stored) as T
  } catch {
    return fallback
  }
}

export function writeJSON<T>(key: string, value: T): void {
  writeString(key, JSON.stringify(value))
}
