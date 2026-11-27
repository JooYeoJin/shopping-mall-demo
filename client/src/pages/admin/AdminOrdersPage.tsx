import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminPageHead } from '@/components/admin/AdminPageHead'
import { AdminOrderDetailModal } from '@/components/admin/AdminOrderDetailModal'
import {
  fetchAdminOrders,
  updateAdminOrder,
} from '@/services/adminOrderService'
import type {
  AdminOrderRecord,
  AdminOrderStatusCounts,
  AdminOrderTabId,
  AdminOrdersListMeta,
} from '@/types/adminOrder'
import { formatKrw } from '@/utils/format'
import {
  ADMIN_ORDER_LOOKUP_TABS,
  adminOrderStatusLabel,
  formatAdminOrderDateTime,
  formatAdminPaymentMethod,
  getAdminOrderCustomerName,
  summarizeOrderItems,
} from '@/utils/adminOrderDisplay'
import {
  alertFulfillmentErrors,
  getFulfillmentTransitionError,
} from '@/utils/adminShippingDisplay'

const emptyCounts: AdminOrderStatusCounts = {
  total: 0,
  pending: 0,
  paid: 0,
  preparing: 0,
  shipping: 0,
  delivered: 0,
  cancel_request: 0,
  cancel_done: 0,
}

const emptyMeta: AdminOrdersListMeta = {
  page: 1,
  limit: 15,
  total: 0,
  totalPages: 0,
}

type Props = {
  mode?: 'desk' | 'lookup'
}

export default function AdminOrdersPage({ mode = 'desk' }: Props) {
  const isLookup = mode === 'lookup'
  const tabs = ADMIN_ORDER_LOOKUP_TABS
  const [orders, setOrders] = useState<AdminOrderRecord[]>([])
  const [meta, setMeta] = useState<AdminOrdersListMeta>(emptyMeta)
  const [statusCounts, setStatusCounts] =
    useState<AdminOrderStatusCounts>(emptyCounts)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<AdminOrderTabId>('all')
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('all')

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  const [selectedOrder, setSelectedOrder] = useState<AdminOrderRecord | null>(
    null
  )

  const listSubtitle = useMemo(() => {
    if (loading) return isLookup ? '주문 조회 …' : '주문 목록 …'
    return `총 ${statusCounts.total}건 (페이지 ${meta.page}/${Math.max(meta.totalPages, 1)})`
  }, [loading, isLookup, statusCounts.total, meta.page, meta.totalPages])

  const loadOrders = useCallback(
    async (targetPage: number) => {
      setError(null)
      setLoading(true)
      try {
        const result = await fetchAdminOrders({
          page: targetPage,
          limit: 15,
          scope: isLookup ? 'lookup' : 'desk',
          status: activeTab,
          q: appliedSearch || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          payment_method: paymentMethod,
        })
        setOrders(result.orders)
        setMeta(result.meta)
        setStatusCounts(result.statusCounts)
        setPage(result.meta.page)
        setSelectedIds(new Set())
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : '주문 목록을 불러오지 못했습니다.'
        )
      } finally {
        setLoading(false)
      }
    },
    [activeTab, appliedSearch, dateFrom, dateTo, paymentMethod, isLookup]
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedSearch(searchInput)
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    void loadOrders(page)
  }, [page, activeTab, appliedSearch, dateFrom, dateTo, paymentMethod, loadOrders])

  const handleTabChange = (tab: AdminOrderTabId) => {
    setActiveTab(tab)
    setPage(1)
  }

  const allSelected =
    orders.length > 0 && orders.every((o) => selectedIds.has(o._id))

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(orders.map((o) => o._id)))
  }

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkApply = async () => {
    if (selectedIds.size === 0) return
    const selected = orders.filter((o) => selectedIds.has(o._id))
    const blocked = selected
      .map((order) => {
        const message = getFulfillmentTransitionError(order, 'preparing')
        return message ? { orderId: order.order_id, message } : null
      })
      .filter((item): item is { orderId: string; message: string } =>
        Boolean(item)
      )
    if (blocked.length > 0) {
      alertFulfillmentErrors(blocked)
      return
    }
    setBulkBusy(true)
    setNotice(null)
    setError(null)
    try {
      const ids = [...selectedIds]
      await Promise.all(
        ids.map((id) => updateAdminOrder(id, { status: 'preparing' }))
      )
      setNotice(`${ids.length}건을 상품준비중으로 넘겼습니다.`)
      void loadOrders(page)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '일괄 상태 변경에 실패했습니다.'
      )
    } finally {
      setBulkBusy(false)
    }
  }

  const goToPage = (next: number) => {
    if (next < 1 || next > meta.totalPages) return
    setPage(next)
  }

  const tableEmpty =
    appliedSearch.trim() || activeTab !== 'all' || dateFrom || dateTo
      ? '조건에 맞는 주문이 없습니다.'
      : '등록된 주문이 없습니다.'

  return (
    <>
      <AdminPageHead
        title={isLookup ? '주문 조회' : '주문 관리'}
        subtitle={listSubtitle}
      />

      <div className="admin-orders-filters">
        <label className="admin-field">
          <span className="admin-field__label">주문 검색</span>
          <input
            type="search"
            className="admin-search__input"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="주문번호, 주문자명, 연락처 입력"
            autoComplete="off"
          />
        </label>
        <div className="admin-field">
          <span className="admin-field__label">주문 기간</span>
          <div className="admin-orders-dates">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPage(1)
              }}
            />
            <span className="admin-orders-dates__sep">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>
        <label className="admin-field">
          <span className="admin-field__label">결제 수단</span>
          <select
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value)
              setPage(1)
            }}
          >
            <option value="all">전체</option>
            <option value="card">신용카드</option>
            <option value="transfer">실시간 계좌이체</option>
            <option value="easy">간편결제</option>
          </select>
        </label>
      </div>

      {isLookup ? (
        <div
          className="admin-orders-tabs"
          role="tablist"
          aria-label="주문 상태"
        >
          {tabs.map((tab) => {
            const count =
              statusCounts[tab.countKey as keyof AdminOrderStatusCounts]
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`admin-orders-tab${isActive ? ' admin-orders-tab--active' : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label} {count}
              </button>
            )
          })}
        </div>
      ) : null}

      {!isLookup ? (
        <div className="admin-orders-bulk">
          <span className="admin-orders-bulk__count">
            선택 {selectedIds.size}건
          </span>
          <div className="admin-orders-bulk__actions">
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={() => void handleBulkApply()}
              disabled={bulkBusy || selectedIds.size === 0}
            >
              상품준비중으로 넘기기
            </button>
          </div>
        </div>
      ) : null}

      {notice ? (
        <p className="admin-message admin-message--success" role="status">
          {notice}
        </p>
      ) : null}
      {error ? <p className="admin-message">{error}</p> : null}
      {loading && !error ? (
        <p className="admin-message admin-message--loading">불러오는 중…</p>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="admin-table-wrap admin-table-wrap--orders">
            <table className="admin-table admin-table--orders">
              <thead>
                <tr>
                  {!isLookup ? (
                    <th scope="col" className="admin-table__col-check">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="현재 페이지 전체 선택"
                      />
                    </th>
                  ) : null}
                  <th scope="col">주문번호</th>
                  <th scope="col">주문일시</th>
                  <th scope="col">주문자</th>
                  <th scope="col">상품</th>
                  <th scope="col">결제금액</th>
                  <th scope="col">결제수단</th>
                  <th scope="col">상태</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={isLookup ? 7 : 8}>{tableEmpty}</td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const summary = summarizeOrderItems(order.items)
                    return (
                      <tr key={order._id}>
                        {!isLookup ? (
                          <td className="admin-table__col-check">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(order._id)}
                              onChange={() => toggleOne(order._id)}
                              aria-label={`${order.order_id} 선택`}
                            />
                          </td>
                        ) : null}
                        <td>
                          <button
                            type="button"
                            className="admin-table__name-btn"
                            onClick={() => setSelectedOrder(order)}
                          >
                            {order.order_id}
                          </button>
                        </td>
                        <td>{formatAdminOrderDateTime(order.createdAt)}</td>
                        <td>{getAdminOrderCustomerName(order)}</td>
                        <td>
                          <div className="admin-order-product-cell">
                            {summary.thumbUrl ? (
                              <img
                                className="admin-table__thumb"
                                src={summary.thumbUrl}
                                alt=""
                                width={48}
                                height={48}
                              />
                            ) : null}
                            <div>
                              <div className="admin-order-product-cell__title">
                                {summary.title}
                              </div>
                              <div className="admin-order-product-cell__qty">
                                총 {summary.totalQty}개
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{formatKrw(order.total)}</td>
                        <td>{formatAdminPaymentMethod(order.payment.method)}</td>
                        <td>
                          <span
                            className={`admin-badge${
                              order.status === 'delivered'
                                ? ' admin-badge--delivered'
                                : ''
                            }`}
                          >
                            {adminOrderStatusLabel(order.status)}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {meta.totalPages > 1 ? (
            <nav className="admin-pagination" aria-label="주문 목록 페이지">
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
              >
                이전
              </button>
              <span className="admin-pagination__status">
                {meta.page} / {meta.totalPages}
              </span>
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => goToPage(page + 1)}
                disabled={page >= meta.totalPages}
              >
                다음
              </button>
            </nav>
          ) : null}
        </>
      ) : null}

      {selectedOrder ? (
        <AdminOrderDetailModal
          order={selectedOrder}
          readOnly={isLookup}
          onClose={() => setSelectedOrder(null)}
          onUpdated={
            isLookup
              ? undefined
              : (updated) => {
                  setSelectedOrder(null)
                  setNotice(
                    '상품준비중으로 넘겼습니다. 배송 관리에서 이어서 처리하세요.'
                  )
                  setOrders((prev) =>
                    prev.map((o) => (o._id === updated._id ? updated : o))
                  )
                  void loadOrders(page)
                }
          }
        />
      ) : null}
    </>
  )
}
