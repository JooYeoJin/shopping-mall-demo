import {
  clearAuthSession,
  getAccessToken,
  getStoredUser,
} from '@/lib/authStorage'
import type { UserRecord } from '@/types/user'

type JwtPayload = {
  sub?: string
  email?: string
  user_type?: UserRecord['user_type']
  exp?: number
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const json = atob(padded)
    return JSON.parse(json) as JwtPayload
  } catch {
    return null
  }
}

function isJwtExpired(payload: JwtPayload): boolean {
  if (typeof payload.exp !== 'number') return true
  return Date.now() >= payload.exp * 1000
}

/** 토큰에서 읽을 수 있는 사용자 식별 정보 (로컬 세션 user 없을 때 보조) */
export function getUserFromToken(token: string): Pick<
  UserRecord,
  '_id' | 'email' | 'user_type'
> | null {
  const payload = decodeJwtPayload(token)
  if (!payload?.sub || !payload.email || !payload.user_type) return null
  return {
    _id: payload.sub,
    email: payload.email,
    user_type: payload.user_type,
  }
}

/**
 * 저장된 액세스 토큰이 유효(미만료)하고 사용자 정보를 알 수 있으면 true.
 * 만료·손상 토큰은 세션을 지운다.
 */
export function hasActiveAuthSession(): boolean {
  const token = getAccessToken()
  if (!token) return false

  const payload = decodeJwtPayload(token)
  if (!payload || isJwtExpired(payload)) {
    clearAuthSession()
    return false
  }

  if (getStoredUser()) return true
  return getUserFromToken(token) !== null
}

export function getActiveSessionUser(): UserRecord | null {
  const token = getAccessToken()
  if (!token) return null

  const payload = decodeJwtPayload(token)
  if (!payload || isJwtExpired(payload)) {
    clearAuthSession()
    return null
  }

  const fromToken = getUserFromToken(token)
  const stored = getStoredUser()

  if (stored) {
    return {
      ...stored,
      user_type: fromToken?.user_type ?? stored.user_type ?? 'customer',
    }
  }

  if (!fromToken) return null

  return {
    ...fromToken,
    name: fromToken.email.split('@')[0] ?? '회원',
    createdAt: '',
    updatedAt: '',
  }
}

export function isAdminUser(user: UserRecord | null): boolean {
  if (!user) return false
  if (user.user_type === 'admin') return true

  const token = getAccessToken()
  if (!token) return false
  return getUserFromToken(token)?.user_type === 'admin'
}