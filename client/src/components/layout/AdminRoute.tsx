import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { getActiveSessionUser, isAdminUser } from '@/lib/authSession'

type Props = {
  children: ReactNode
}

/** admin 사용자만 하위 페이지 접근 허용 */
export function AdminRoute({ children }: Props) {
  const user = getActiveSessionUser()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!isAdminUser(user)) {
    return <Navigate to="/" replace />
  }

  return children
}