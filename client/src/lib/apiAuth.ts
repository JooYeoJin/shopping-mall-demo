import { getAccessToken } from '@/lib/authStorage'
import { getApiBaseUrl } from '@/config/env'

function buildUrl(path: string): string {
  const base = getApiBaseUrl()
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`
}

function authHeaders(jsonBody = false): HeadersInit {
  const headers: Record<string, string> = {}
  const token = getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (jsonBody) headers['Content-Type'] = 'application/json'
  return headers
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

export async function apiGetAuth<T>(path: string): Promise<T> {
  const res = await fetch(buildUrl(path), { headers: authHeaders() })
  if (!res.ok) throw new Error(await readErrorMessage(res))
  return res.json() as Promise<T>
}

export async function apiPostAuth<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readErrorMessage(res))
  return res.json() as Promise<T>
}

export async function apiPatchAuth<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: 'PATCH',
    headers: authHeaders(true),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readErrorMessage(res))
  return res.json() as Promise<T>
}

export async function apiDeleteAuth(path: string): Promise<void> {
  const res = await fetch(buildUrl(path), {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(await readErrorMessage(res))
}

export async function apiDeleteAuthJson<T>(path: string): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(await readErrorMessage(res))
  if (res.status === 204) {
    return undefined as T
  }
  return res.json() as Promise<T>
}