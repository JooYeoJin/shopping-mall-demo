import type { UserRecord } from '@/types/user'

const ACCESS_TOKEN_KEY = 'shopping_mall_access_token'
const USER_SESSION_KEY = 'shopping_mall_user'

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setStoredUser(user: UserRecord): void {
  localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user))
}

export function getStoredUser(): UserRecord | null {
  const raw = localStorage.getItem(USER_SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserRecord
  } catch {
    return null
  }
}

export function clearAuthSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(USER_SESSION_KEY)
}