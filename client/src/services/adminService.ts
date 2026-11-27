import { apiGet, apiPost } from '@/lib/api'
import type { AdminDashboardStats } from '@/types/admin'
import type { UserRecord } from '@/types/user'

type StatsResponse = { stats: AdminDashboardStats }
type UsersResponse = { users: UserRecord[] }
type ResetPasswordResponse = {
  user: UserRecord
  temporary_password: string
}

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  const { stats } = await apiGet<StatsResponse>('/api/admin/stats')
  return stats
}

export async function fetchAllUsers(): Promise<UserRecord[]> {
  const { users } = await apiGet<UsersResponse>('/api/users')
  return users
}

export async function resetUserPassword(
  userId: string
): Promise<ResetPasswordResponse> {
  return apiPost<ResetPasswordResponse>(
    `/api/users/${userId}/reset-password`,
    {}
  )
}