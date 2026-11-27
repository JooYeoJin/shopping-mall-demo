import { useState } from 'react'

export type AdminRollbackStep = { value: string; label: string }

type Props = {
  orderId: string
  options: readonly AdminRollbackStep[]
  reasonRequired?: boolean
  busy?: boolean
  onClose: () => void
  onApply: (status: string, reason: string) => void
}

export function AdminRollbackModal({
  orderId,
  options,
  reasonRequired = false,
  busy = false,
  onClose,
  onApply,
}: Props) {
  const [rollbackTo, setRollbackTo] = useState(
    options.length > 0 ? options[options.length - 1].value : ''
  )
  const [reason, setReason] = useState('')

  const handleApply = () => {
    if (!rollbackTo) {
      window.alert('되돌릴 단계를 선택해 주세요.')
      return
    }
    if (reasonRequired && !reason.trim()) {
      window.alert('되돌리는 사유를 입력해 주세요.')
      return
    }
    onApply(rollbackTo, reason.trim())
  }

  return (
    <div
      className="admin-modal-backdrop admin-modal-backdrop--nested"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div
        className="admin-modal admin-modal--narrow"
        role="dialog"
        aria-labelledby="admin-rollback-modal-title"
      >
        <div className="admin-modal__head">
          <h2 className="admin-modal__title" id="admin-rollback-modal-title">
            단계 되돌리기 · {orderId}
          </h2>
          <button
            type="button"
            className="admin-modal__close"
            onClick={onClose}
            disabled={busy}
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <p className="admin-field__label">되돌릴 단계</p>
        <fieldset className="admin-rollback__choices">
          <legend className="visually-hidden">되돌릴 단계 선택</legend>
          {options.map((step) => (
            <label key={step.value} className="admin-rollback__option">
              <input
                type="radio"
                name="rollback-step"
                value={step.value}
                checked={rollbackTo === step.value}
                onChange={() => setRollbackTo(step.value)}
                disabled={busy}
              />
              {step.label}
            </label>
          ))}
        </fieldset>

        <label className="admin-field">
          <span className="admin-field__label">
            {reasonRequired ? '사유' : '사유 (선택)'}
          </span>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={busy}
            placeholder={
              reasonRequired
                ? '되돌리는 이유를 입력해 주세요'
                : '되돌리는 이유를 남길 수 있습니다'
            }
          />
        </label>

        <div className="admin-modal__actions">
          <button
            type="button"
            className="admin-btn admin-btn--danger"
            disabled={busy}
            onClick={handleApply}
          >
            되돌리기 적용
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            disabled={busy}
            onClick={onClose}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
