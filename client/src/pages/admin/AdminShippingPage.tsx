import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminPageHead } from '@/components/admin/AdminPageHead'
import { AdminShipDetailModal } from '@/components/admin/AdminShipDetailModal'
import {
  fetchAdminOrders,
  updateAdminOrder,
} from '@/services/adminOrderService'
import type {
  AdminOrderRecord,
  AdminOrderStatusCounts,
  AdminOrdersListMeta,
  AdminShippingTabId,
} from '@/types/adminOrder'
import { formatKrw } from '@/utils/format'
import {
  adminOrderStatusLabel,
  formatAdminOrderDateTime,
  getAdminOrderCustomerName,
  summarizeOrderItems,
} from '@/utils/adminOrderDisplay'
import {
  ADMIN_SHIPPING_TABS,
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

function defaultBulkStatus(tab: AdminShippingTabId): string {
  if (tab === 'preparing') return 'shipping'
  if (tab === 'shipping') return 'delivered'
  return 'shipping'
}

export default function AdminShippingPage() {
  const [orders, setOrders] = useState<AdminOrderRecord[]>([])
  const [meta, setMeta] = useState<AdminOrdersListMeta>(emptyMeta)
  const [statusCounts, setStatusCounts] =
    useState<AdminOrderStatusCounts>(emptyCounts)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<AdminShippingTabId>('fulfillment')
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState('shipping')
  const [bulkBusy, setBulkBusy] = useState(false)

  const [selectedOrder, setSelectedOrder] = useState<AdminOrderRecord | null>(
    null
  )

  const fulfillmentTotal =
    statusCounts.preparing + statusCounts.shipping + statusCounts.delivered

  const tabCount = (key: (typeof ADMIN_SHIPPING_TABS)[number]['countKey']) => {
    if (key === 'fulfillment') return fulfillmentTotal
    return statusCounts[key]
  }

  const listSubtitle = useMemo(() => {
    if (loading) return '배송 목록 …'
    return `배송 대상 ${fulfillmentTotal}건 (페이지 ${meta.page}/${Math.max(meta.totalPages, 1)})`
  }, [loading, fulfillmentTotal, meta.page, meta.totalPages])

  const loadOrders = useCallback(
    async (targetPage: number) => {
      setError(null)
      setLoading(true)
      try {
        const result = await fetchAdminOrders({
          page: targetPage,
          limit: 15,
          status: activeTab,
          q: appliedSearch || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
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
            : '배송 목록을 불러오지 못했습니다.'
        )
      } finally {
        setLoading(false)
      }
    },
    [activeTab, appliedSearch, dateFrom, dateTo]
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
  }, [page, activeTab, appliedSearch, dateFrom, dateTo, loadOrders])

  const handleTabChange = (tab: AdminShippingTabId) => {
    setActiveTab(tab)
    setBulkStatus(defaultBulkStatus(tab))
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
        const message = getFulfillmentTransitionError(order, bulkStatus)
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
    setError(null)
    setNotice(null)
    try {
      await Promise.all(
        selected.map((order) =>
          updateAdminOrder(order._id, { status: bulkStatus })
        )
      )
      setNotice(`${selected.length}건 상태를 변경했습니다.`)
      void loadOrders(page)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '일괄 처리에 실패했습니다.'
      window.alert(`처리할 수 없습니다.\n\n${message}`)
      setError(message)
    } finally {
      setBulkBusy(false)
    }
  }

  const goToPage = (next: number) => {
    if (next < 1 || next > meta.totalPages) return
    setPage(next)
  }

  const tableEmpty =
    appliedSearch.trim() || activeTab !== 'fulfillment' || dateFrom || dateTo
      ? '조건에 맞는 출고 건이 없습니다.'
      : '배송 대상 주문이 없습니다.'

  return (
    <>
      <AdminPageHead title="배송 관리" subtitle={listSubtitle} />

      <div className="admin-orders-filters admin-orders-filters--two">
        <label className="admin-field">
          <span className="admin-field__label">검색</span>
          <input
            type="search"
            className="admin-search__input"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="주문번호, 수령인, 연락처, 송장번호"
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
      </div>

      <div
        className="admin-orders-tabs"
        role="tablist"
        aria-label="출고 단계"
      >
        {ADMIN_SHIPPING_TABS.map((tab) => {
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
              {tab.label} {tabCount(tab.countKey)}
            </button>
          )
        })}
      </div>

      <div className="admin-orders-bulk">
        <span className="admin-orders-bulk__count">
          선택 {selectedIds.size}건
        </span>
        <div className="admin-orders-bulk__actions">
          <label className="admin-orders-bulk__select">
            <span className="admin-orders-bulk__label">일괄 처리</span>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              disabled={bulkBusy}
            >
              <option value="shipping">출고 (배송중) — 송장 있는 건만</option>
              <option value="delivered">배송완료로</option>
            </select>
          </label>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={() => void handleBulkApply()}
            disabled={bulkBusy || selectedIds.size === 0}
          >
            적용
          </button>
        </div>
      </div>

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
                  <th scope="col" className="admin-table__col-check">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="현재 페이지 전체 선택"
                    />
                  </th>
                  <th scope="col">주문번호</th>
                  <th scope="col">주문일시</th>
                  <th scope="col">수령인</th>
                  <th scope="col">배송지</th>
                  <th scope="col">상품</th>
                  <th scope="col">송장</th>
                  <th scope="col" className="admin-table__col-status">
                    상태
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={8}>{tableEmpty}</td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const summary = summarizeOrderItems(order.items)
                    const invoice =
                      order.status === 'shipping' || order.status === 'delivered'
                        ? [order.shipping.carrier, order.shipping.tracking_number]
                            .filter(Boolean)
                            .join(' ')
                        : ''
                    return (
                      <tr key={order._id}>
                        <td className="admin-table__col-check">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(order._id)}
                            onChange={() => toggleOne(order._id)}
                            aria-label={`${order.order_id} 선택`}
                          />
                        </td>
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
                          <div className="admin-table__addr">
                            {order.shipping.address}
                            {order.shipping.address_detail
                              ? ` ${order.shipping.address_detail}`
                              : ''}
                          </div>
                        </td>
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
                                총 {summary.totalQty}개 · {formatKrw(order.total)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{invoice || '—'}</td>
                        <td className="admin-table__col-status">
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
            <nav className="admin-pagination" aria-label="배송 목록 페이지">
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
        <AdminShipDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdated={(updated) => {
            setSelectedOrder(null)
            setNotice('배송 정보가 저장되었습니다.')
            setOrders((prev) =>
              prev.map((o) => (o._id === updated._id ? updated : o))
            )
            void loadOrders(page)
          }}
        />
      ) : null}
    </>
  )
}
