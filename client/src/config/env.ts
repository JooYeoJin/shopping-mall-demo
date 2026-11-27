export function getApiBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL?.trim() ?? ''
  return url.replace(/\/$/, '')
}