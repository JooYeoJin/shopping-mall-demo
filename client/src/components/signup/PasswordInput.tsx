import { useState } from 'react'
import { FieldRow } from './FieldRow'

type PasswordInputProps = {
  label: string
  required?: boolean
  hint?: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
}

export function PasswordInput({
  label,
  required,
  hint,
  value,
  onChange,
  autoComplete,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <FieldRow label={label} required={required} hint={hint}>
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="signup-field__toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? '비밀번호 숨기기' : '비밀번호 표시'}
      >
        {visible ? '숨김' : '표시'}
      </button>
    </FieldRow>
  )
}