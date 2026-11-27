import { useState } from 'react'
import { resetUserPassword, setUserType } from '@/services/adminService'
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
  onUpdated?: (user: UserRecord) => void
}

export function AdminMemberDetailModal({ user, onClose, onUpdated }: Props) {
  const [member, setMember] = useState(user)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [typeMessage, setTypeMessage] = useState<string | null>(null)

  const handleReset = async () => {
    if (
      !window.confirm(
        `${member.email} 비밀번호를 11111로 초기화할까요?`
      )
    ) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await resetUserPassword(member._id)
      setTempPassword(result.temporary_password)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '비밀번호를 초기화하지 못했습니다.'
      )
    } finally {
      setBusy(false)
    }
  }

  const handleChangeType = async (nextType: UserRecord['user_type']) => {
    const nextLabel = typeLabel(nextType)
    if (
      !window.confirm(
        `${member.email} 회원을 ${nextLabel}(${nextType})으로 지정할까요?`
      )
    ) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const updated = await setUserType(member._id, nextType)
      setMember(updated)
      setTypeMessage(`${nextLabel}(${nextType})으로 지정되었습니다.`)
      onUpdated?.(updated)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '회원 유형을 변경하지 못했습니다.'
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
            <dd>{member.name}</dd>
          </div>
          <div>
            <dt>유형</dt>
            <dd>{typeLabel(member.user_type)}</dd>
          </div>
          <div className="admin-product-detail__meta-row--full">
            <dt>아이디</dt>
            <dd>{member.email}</dd>
          </div>
          <div className="admin-product-detail__meta-row--full">
            <dt>주소</dt>
            <dd>{member.address?.trim() || '—'}</dd>
          </div>
          <div>
            <dt>가입일</dt>
            <dd>{formatDate(member.createdAt)}</dd>
          </div>
          <div>
            <dt>수정일</dt>
            <dd>{formatDate(member.updatedAt)}</dd>
          </div>
        </dl>

        {tempPassword ? (
          <p className="admin-message admin-message--success" role="status">
            비밀번호가 <strong>{tempPassword}</strong> 로 초기화되었습니다.
          </p>
        ) : null}
        {typeMessage ? (
          <p className="admin-message admin-message--success" role="status">
            {typeMessage}
          </p>
        ) : null}
        {error ? <p className="admin-message">{error}</p> : null}

        <div className="admin-modal__actions">
          {member.user_type === 'customer' ? (
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              disabled={busy}
              onClick={() => void handleChangeType('admin')}
            >
              어드민 지정
            </button>
          ) : (
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              disabled={busy}
              onClick={() => void handleChangeType('customer')}
            >
              일반 회원 지정
            </button>
          )}
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
