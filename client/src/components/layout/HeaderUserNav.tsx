import { memo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { UserRecord } from '@/types/user'
import { isAdminUser } from '@/lib/authSession'
import { logout } from '@/services/authService'

type Props = {
  user: UserRecord
  onLoggedOut?: () => void
}

function HeaderUserNavComponent({ user, onLoggedOut }: Props) {
  const navigate = useNavigate()

  const handleLogout = useCallback(() => {
    logout()
    onLoggedOut?.()
    navigate('/login', { replace: true })
  }, [navigate, onLoggedOut])

  return (
    <>
      <Link className="home-landing__nav-link" to="/orders">
        MY ORDERS
      </Link>
      {isAdminUser(user) && (
        <Link className="home-landing__nav-link" to="/admin/dashboard">
          Admin
        </Link>
      )}
      <button
        type="button"
        className="home-landing__nav-link"
        onClick={handleLogout}
      >
        Logout
      </button>
    </>
  )
}

export const HeaderUserNav = memo(HeaderUserNavComponent)