import { useEffect, useState } from 'react'
import { AdminOrderTrendChart } from '@/components/admin/AdminOrderTrendChart'
import { AdminPageHead } from '@/components/admin/AdminPageHead'
import { fetchAdminDashboardStats } from '@/services/adminService'
import type { AdminDashboardStats } from '@/types/admin'
import { formatKrw, formatNumber } from '@/utils/format'

type StatKey = Exclude<
  keyof AdminDashboardStats,
  'orderTrend' | 'orderTrendMonth'
>

// 대시보드 통계 항목 목록
const STAT_ITEMS: {
  key: StatKey
  label: string
  format: (v: number) => string
  hint?: string
}[] = [
  { key: 'totalOrders', 
    label: '총 주문 수', 
    format: formatNumber,
    hint: '결제 완료 건 수',
  },
  { key: 'totalProducts', 
    label: '등록 상품 수', 
    format: formatNumber,
    hint: '사이트에 등록된 상품 수', },
  { key: 'totalCustomers', 
    label: '고객 수', 
    format: formatNumber,
    hint: '가입 회원 수 (customer 타입)',
  },
  {
    key: 'totalRevenue',
    label: '총 매출',
    format: formatKrw,
    hint: '주문·결제 연동 후 집계',
  },
]

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchAdminDashboardStats()
        if (!cancelled) setStats(data)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : '통계를 불러오지 못했습니다.'
          )
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <AdminPageHead
        title="대시보드"
        subtitle="운영 현황 요약 — WITHBLOOMING"
      />

      {error && <p className="admin-message">{error}</p>}
      {!error && !stats && (
        <p className="admin-message admin-message--loading">불러오는 중…</p>
      )}

      {stats && (
        <div className="admin-stat-grid">
          {STAT_ITEMS.map(({ key, label, format, hint }) => (
            <article key={key} className="admin-stat-card">
              <p className="admin-stat-card__label">{label}</p>
              <p className="admin-stat-card__value">
                {format((stats[key] as number | undefined) ?? 0)}
              </p>
              {hint ? <p className="admin-stat-card__hint">{hint}</p> : null}
            </article>
          ))}
        </div>
      )}

      {stats?.orderTrend?.length ? (
        <section className="admin-panel admin-panel--trend">
          <h2 className="admin-panel__title">
            월별 주문 추이
            {stats.orderTrendMonth ? (
              <span className="admin-panel__title-meta">
                {stats.orderTrendMonth}
              </span>
            ) : null}
          </h2>
          <AdminOrderTrendChart points={stats.orderTrend} />
        </section>
      ) : null}
    </>
  )
}