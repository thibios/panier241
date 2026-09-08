const PREFIX = 'panier241:'

export function readSession<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeSession<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Stockage indisponible (navigation privée, quota...) : on continue sans persister.
  }
}

export function clearSession(key: string): void {
  try {
    sessionStorage.removeItem(PREFIX + key)
  } catch {
    // Stockage indisponible : rien à nettoyer.
  }
}

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Stockage indisponible (navigation privée, quota...) : on continue sans persister.
  }
}
