export const API_BASE = process.env.TARO_APP_API_BASE_URL || 'http://localhost:25051'

export function apiUrl(path: string): string {
  return `${API_BASE}/api${path}`
}
