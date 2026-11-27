import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getActiveSessionUser } from '@/lib/authSession'
import type { UserRecord } from '@/types/user'

type HomeLocationState = {
  loginMessage?: string
}

export function useSessionUser() {
  const location = useLocation()
  const state = location.state as HomeLocationState | null
  const loginFlash = state?.loginMessage

  const [sessionUser, setSessionUser] = useState<UserRecord | null>(() =>
    getActiveSessionUser()
  )

  useEffect(() => {
    setSessionUser(getActiveSessionUser())
  }, [location.key])

  const clearSession = useCallback(() => {
    setSessionUser(null)
  }, [])

  return { sessionUser, clearSession, loginFlash }
}