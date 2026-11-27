import {
  useCallback,
  useLayoutEffect,
  useState,
  type FormEvent,
} from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { hasActiveAuthSession } from '@/lib/authSession'
import { loginWithCredentials } from '@/services/authService'
import { isValidEmailFormat } from '@/utils/email'
import './login.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const [gateReady, setGateReady] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useLayoutEffect(() => {
    if (hasActiveAuthSession()) {
      navigate('/', { replace: true })
      return
    }
    setGateReady(true)
  }, [navigate])

  const validateClient = useCallback((): string | null => {
    const trimmed = email.trim()
    if (!trimmed) return '아이디(이메일)를 입력해 주세요.'
    if (!isValidEmailFormat(trimmed)) {
      return '이메일 형식이 올바르지 않습니다. (예: user@example.com)'
    }
    if (!password) return '비밀번호를 입력해 주세요.'
    return null
  }, [email, password])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const validationError = validateClient()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    try {
      const user = await loginWithCredentials({ email, password })
      setPassword('')
      navigate('/', {
        replace: true,
        state: { loginMessage: `${user.name}님, 환영합니다.` },
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '로그인에 실패했습니다. 다시 시도해 주세요.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (!gateReady) {
    return null
  }

  return (
    <div className="login-page">
      <nav className="login-page__tabs" aria-label="계정 메뉴">
        <span className="login-page__tab login-page__tab--active">로그인</span>
        <Link className="login-page__tab" to="/signup">
          회원가입
        </Link>
      </nav>

      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <div className="login-field">
          <div className="login-field__head">
            <span className="login-field__label">아이디</span>
            <button type="button" className="login-field__link">
              아이디 찾기
            </button>
          </div>
          <div className="login-field__control">
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              disabled={loading}
              aria-label="아이디(이메일)"
            />
          </div>
        </div>

        <div className="login-field">
          <div className="login-field__head">
            <span className="login-field__label">비밀번호</span>
            <button type="button" className="login-field__link">
              비밀번호 찾기
            </button>
          </div>
          <div className="login-field__control">
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
              aria-label="비밀번호"
            />
          </div>
        </div>

        <button
          type="submit"
          className="login-form__submit"
          disabled={loading}
        >
          {loading ? '로그인 중…' : '로그인'}
        </button>

        <Link className="login-form__secondary" to="/signup">
          회원가입
        </Link>

        {error && (
          <p
            className="login-form__message login-form__message--error"
            role="alert"
          >
            {error}
          </p>
        )}
      </form>
    </div>
  )
}