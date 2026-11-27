import { apiPost } from '@/lib/api'
import type { CreateUserPayload, UserRecord } from '@/types/user'

type CreateUserResponse = { user: UserRecord }

/** POST /api/users — 회원가입 폼 데이터를 서버 MongoDB에 저장 */
export async function registerUser(
  payload: CreateUserPayload
): Promise<UserRecord> {
  const { user } = await apiPost<CreateUserResponse>('/api/users', payload)
  return user
}