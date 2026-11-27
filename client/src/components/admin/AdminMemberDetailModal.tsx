import { useState } from 'react'
import { resetUserPassword } from '@/services/adminService'
import type { UserRecord } from '@/types/user'

function formatDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function typeLabel(type: string): string {
  if (type === 'admin') return '관리자'
  if (type === 'customer') return '일반 회원'
  return type
}

type Props = {
  user: UserRecord
  onClose: () => void
}

export function AdminMemberDetailModal({ user, onClose }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  const handleReset = async () => {
    if (
      !window.confirm(
        `${user.email} 비밀번호를 11111로 초기화할까요?`
      )
    ) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await resetUserPassword(user._id)
      setTempPassword(result.temporary_password)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '비밀번호를 초기화하지 못했습니다.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div
        className="admin-modal admin-modal--narrow"
        role="dialog"
        aria-labelledby="admin-member-modal-title"
      >
        <div className="admin-modal__head">
          <h2 className="admin-modal__title" id="admin-member-modal-title">
            회원 정보
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

        <dl className="admin-product-detail__meta">
          <div>
            <dt>이름</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt>유형</dt>
            <dd>{typeLabel(user.user_type)}</dd>
          </div>
          <div className="admin-product-detail__meta-row--full">
            <dt>아이디</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="admin-product-detail__meta-row--full">
            <dt>주소</dt>
            <dd>{user.address?.trim() || '—'}</dd>
          </div>
          <div>
            <dt>가입일</dt>
            <dd>{formatDate(user.createdAt)}</dd>
          </div>
          <div>
            <dt>수정일</dt>
            <dd>{formatDate(user.updatedAt)}</dd>
          </div>
        </dl>

        {tempPassword ? (
          <p className="admin-message admin-message--success" role="status">
            비밀번호가 <strong>{tempPassword}</strong> 로 초기화되었습니다.
          </p>
        ) : null}
        {error ? <p className="admin-message">{error}</p> : null}

        <div className="admin-modal__actions">
          <button
            type="button"
            className="admin-btn admin-btn--muted"
            disabled={busy}
            onClick={() => void handleReset()}
          >
            비밀번호 초기화
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={onClose}
            disabled={busy}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
