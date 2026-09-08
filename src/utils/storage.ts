const prefix = 'miraihub-docs:v1:'

export function loadJson<T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T
): T {
  try {
    const raw = localStorage.getItem(prefix + key)
    if (!raw) return fallback
    const parsed: unknown = JSON.parse(raw)
    return validate(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

export function persistJson(key: string, value: unknown): void {
  localStorage.setItem(prefix + key, JSON.stringify(value))
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
