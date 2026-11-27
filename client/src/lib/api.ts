import { getApiBaseUrl } from '@/config/env'

function buildUrl(path: string): string {
  const base = getApiBaseUrl()
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`
}

async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text()
  if (!text) return res.statusText
  try {
    const data = JSON.parse(text) as {
      message?: string
      errors?: string[]
    }
    if (data.errors?.length) return data.errors.join('\n')
    if (data.message) return data.message
  } catch {
    /* plain text */
  }
  return text
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(buildUrl(path))
  if (!res.ok) throw new Error(await readErrorMessage(res))
  return res.json() as Promise<T>
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readErrorMessage(res))
  return res.json() as Promise<T>
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readErrorMessage(res))
  return res.json() as Promise<T>
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(buildUrl(path), { method: 'DELETE' })
  if (!res.ok) throw new Error(await readErrorMessage(res))
}