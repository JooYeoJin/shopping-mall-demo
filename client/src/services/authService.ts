import {
  clearAuthSession,
  setAccessToken,
  setStoredUser,
} from '@/lib/authStorage'
import { apiPost } from '@/lib/api'
import type { UserRecord } from '@/types/user'

export type LoginPayload = {
  email: string
  password: string
}

type LoginResponse = {
  message: string
  token: string
  user: UserRecord
}

const API_MESSAGE_KO: Record<string, string> = {
  'email and password are required':
    '이메일과 비밀번호를 입력해 주세요.',
  'Invalid email format. Use something like user@example.com':
    '이메일 형식이 올바르지 않습니다. (예: user@example.com)',
  'Failed to issue access token':
    '로그인 토큰 발급에 실패했습니다. 서버 설정을 확인한 뒤 다시 시도해 주세요.',
  'JWT_SECRET이 설정되지 않았습니다. server/.env에 값을 넣고 서버를 재시작해 주세요.':
    'JWT_SECRET이 설정되지 않았습니다. server/.env에 값을 넣고 서버를 재시작해 주세요.',
  '로그인 토큰 발급에 실패했습니다.':
    '로그인 토큰 발급에 실패했습니다. 서버를 재시작한 뒤 다시 시도해 주세요.',
}

function toKoreanApiMessage(message: string): string {
  return API_MESSAGE_KO[message] ?? message
}

/**
 * POST /api/auth/login
 * 서버 auth.controller의 loginUser와 동일한 body: { email, password }
 */
export async function loginWithCredentials(
  payload: LoginPayload
): Promise<UserRecord> {
  const email = payload.email.trim().toLowerCase()

  try {
    const { token, user } = await apiPost<LoginResponse>('/api/auth/login', {
      email,
      password: payload.password,
    })
    setAccessToken(token)
    setStoredUser(user)
    return user
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(toKoreanApiMessage(err.message))
    }
    throw new Error('로그인에 실패했습니다. 다시 시도해 주세요.')
  }
}

export function logout(): void {
  clearAuthSession()
}