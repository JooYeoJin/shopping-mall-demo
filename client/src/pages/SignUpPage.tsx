import { useCallback, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AgreementSection } from '@/components/signup/AgreementSection'
import { FieldRow } from '@/components/signup/FieldRow'
import { PasswordInput } from '@/components/signup/PasswordInput'
import { registerUser } from '@/services/userService'
import type { CreateUserPayload } from '@/types/user'
import { isValidEmailFormat } from '@/utils/email'
import './signup.css'

const initialForm = {
  email: '',
  name: '',
  password: '',
  passwordConfirm: '',
  address: '',
}

const initialAgreements = {
  agreeAll: false,
  agreeTerms: false,
  agreePrivacy: false,
  agreeMarketing: false,
  agreeSms: false,
  agreeEmail: false,
}

export default function SignUpPage() {
  const [form, setForm] = useState(initialForm)
  const [agreements, setAgreements] = useState(initialAgreements)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const setField = useCallback(
    <K extends keyof typeof initialForm>(key: K, value: (typeof initialForm)[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const handleAgreeAll = useCallback((checked: boolean) => {
    setAgreements({
      agreeAll: checked,
      agreeTerms: checked,
      agreePrivacy: checked,
      agreeMarketing: checked,
      agreeSms: checked,
      agreeEmail: checked,
    })
  }, [])

  const updateAgreement = useCallback(
    (patch: Partial<typeof initialAgreements>) => {
      setAgreements((prev) => {
        const next = { ...prev, ...patch, agreeAll: false }
        const allRequired = next.agreeTerms && next.agreePrivacy
        const allOptional =
          next.agreeMarketing && next.agreeSms && next.agreeEmail
        if (allRequired && allOptional) next.agreeAll = true
        return next
      })
    },
    []
  )

  const validateClient = (): string | null => {
    if (!form.email.trim()) return '이메일(E-mail)을 입력해 주세요.'
    if (!isValidEmailFormat(form.email)) {
      return '이메일 형식이 올바르지 않습니다. (예: user@example.com)'
    }
    if (!form.name.trim()) return '이름(Name)을 입력해 주세요.'
    if (!form.password) return '비밀번호(Password)를 입력해 주세요.'
    if (form.password !== form.passwordConfirm) {
      return '비밀번호 확인이 일치하지 않습니다.'
    }
    if (!agreements.agreeTerms || !agreements.agreePrivacy) {
      return '필수 약관에 동의해 주세요.'
    }
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const validationError = validateClient()
    if (validationError) {
      setError(validationError)
      return
    }

    const payload: CreateUserPayload = {
      email: form.email.trim(),
      name: form.name.trim(),
      password: form.password,
      user_type: 'customer',
      address: form.address.trim() || null,
    }

    setLoading(true)
    try {
      await registerUser(payload)
      setSuccess(true)
      setForm(initialForm)
      setAgreements(initialAgreements)
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="signup-page">
      <h1 className="signup-page__brand">WITHBLOOMING</h1>

      <form className="signup-form" onSubmit={handleSubmit} noValidate>
        <h2 className="signup-form__section-title">회원 정보</h2>

        <FieldRow label="이메일(E-mail)" required>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
            autoComplete="email"
            placeholder="user@example.com"
          />
        </FieldRow>

        <PasswordInput
          label="비밀번호(Password)"
          required
          hint="(영문 대소문자/숫자 조합 권장)"
          value={form.password}
          onChange={(v) => setField('password', v)}
          autoComplete="new-password"
        />

        <PasswordInput
          label="비밀번호 확인(Password confirm)"
          required
          value={form.passwordConfirm}
          onChange={(v) => setField('passwordConfirm', v)}
          autoComplete="new-password"
        />

        <FieldRow label="이름(Name)" required>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            autoComplete="name"
          />
        </FieldRow>

        <FieldRow label="주소(Address)" hint="(선택)">
          <textarea
            value={form.address}
            onChange={(e) => setField('address', e.target.value)}
            autoComplete="street-address"
            rows={1}
          />
        </FieldRow>

        <AgreementSection
          agreeAll={agreements.agreeAll}
          agreeTerms={agreements.agreeTerms}
          agreePrivacy={agreements.agreePrivacy}
          agreeMarketing={agreements.agreeMarketing}
          agreeSms={agreements.agreeSms}
          agreeEmail={agreements.agreeEmail}
          onAgreeAllChange={handleAgreeAll}
          onAgreeTermsChange={(c) => updateAgreement({ agreeTerms: c })}
          onAgreePrivacyChange={(c) => updateAgreement({ agreePrivacy: c })}
          onAgreeMarketingChange={(c) =>
            updateAgreement({
              agreeMarketing: c,
              agreeSms: c ? agreements.agreeSms : false,
              agreeEmail: c ? agreements.agreeEmail : false,
            })
          }
          onAgreeSmsChange={(c) => updateAgreement({ agreeSms: c })}
          onAgreeEmailChange={(c) => updateAgreement({ agreeEmail: c })}
        />

        <button
          type="submit"
          className="signup-form__submit"
          disabled={loading}
        >
          {loading ? '가입 처리 중…' : '회원가입'}
        </button>

        {error && (
          <p className="signup-form__message signup-form__message--error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p
            className="signup-form__message signup-form__message--success"
            role="status"
          >
            회원가입이 완료되었습니다.{' '}
            <Link to="/">메인으로 돌아가기</Link>
          </p>
        )}
      </form>
    </div>
  )
}