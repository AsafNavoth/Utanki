export const getStorageItem = <T>(
  key: string,
  parse: (value: string) => T | null,
  fallback: T
): T => {
  try {
    const stored = localStorage.getItem(key)

    if (stored === null) return fallback
    const parsed = parse(stored)

    return parsed !== null ? parsed : fallback
  } catch (error) {
    if (import.meta.env.DEV) console.warn('localStorage getItem failed:', error)

    return fallback
  }
}

export const setStorageItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value)
  } catch (error) {
    if (import.meta.env.DEV) console.warn('localStorage setItem failed:', error)
  }
}
