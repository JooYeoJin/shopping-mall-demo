import type { ReactNode } from 'react'

type FieldRowProps = {
  label: string
  required?: boolean
  hint?: string
  children: ReactNode
}

export function FieldRow({ label, required, hint, children }: FieldRowProps) {
  return (
    <div className="signup-field">
      <div className="signup-field__head">
        <span className="signup-field__label">
          {label}
          {required && <span className="signup-field__required">*</span>}
        </span>
        {hint && <span className="signup-field__hint">{hint}</span>}
      </div>
      <div className="signup-field__control">{children}</div>
    </div>
  )
}