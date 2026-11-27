import { useEffect, useState } from 'react'
import { AdminPageHead } from '@/components/admin/AdminPageHead'
import { AdminMemberDetailModal } from '@/components/admin/AdminMemberDetailModal'
import { fetchAllUsers } from '@/services/adminService'
import type { UserRecord } from '@/types/user'
import { formatNumber } from '@/utils/format'

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

export default function AdminMembersPage() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await fetchAllUsers()
        if (!cancelled) setUsers(list)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : '회원 목록을 불러오지 못했습니다.'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <AdminPageHead
        title="회원 관리"
        subtitle={`전체 ${loading ? '…' : formatNumber(users.length)}명`}
      />

      {error && <p className="admin-message">{error}</p>}
      {loading && !error && (
        <p className="admin-message admin-message--loading">불러오는 중…</p>
      )}

      {!loading && !error && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">이름</th>
                <th scope="col">아이디</th>
                <th scope="col">유형</th>
                <th scope="col">가입일</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4}>등록된 회원이 없습니다.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-table__name-btn"
                        onClick={() => setSelectedUser(user)}
                      >
                        {user.email}
                      </button>
                    </td>
                    <td>
                      <span
                        className={`admin-badge${user.user_type === 'admin' ? ' admin-badge--admin' : ''}`}
                      >
                        {user.user_type}
                      </span>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedUser ? (
        <AdminMemberDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      ) : null}
    </>
  )
}