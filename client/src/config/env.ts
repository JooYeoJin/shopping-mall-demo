export function getApiBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL?.trim() ?? ''
  const base = url.replace(/\/$/, '')
  if (import.meta.env.PROD && !base) {
    console.warn(
      '[env] VITE_API_URL이 비어 있습니다. Vercel Environment Variables에 Heroku origin을 넣고 다시 빌드하세요.',
    )
  }
  return base
}