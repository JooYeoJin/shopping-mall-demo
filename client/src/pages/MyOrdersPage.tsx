import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link } from 'react-router-dom'
import { HomeLandingHeader } from '@/components/home/HomeLandingHeader'
import { getAccessToken } from '@/lib/authStorage'
import { useSessionUser } from '@/hooks/useSessionUser'
import { fetchMyOrders } from '@/services/orderService'
import type { OrderRecord } from '@/types/order'
import { formatKrw } from '@/utils/format'
import {
  TRACKER_STEPS,
  formatOrderDate,
  shouldShowOrderTracker,
  formatPaymentMethod,
  formatShippingAddress,
  getOrderStatusLabel,
  getTrackerStepIndex,
  isNewOrder,
  orderBadgeClass,
  orderMatchesFilter,
  type OrderListFilter,
} from '@/utils/orderDisplay'
import './home.css'
import './shop.css'
import './orders.css'

const FILTERS: { id: OrderListFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'paid', label: '결제완료' },
  { id: 'preparing', label: '상품준비중' },
  { id: 'shipping', label: '배송중' },
  { id: 'delivered', label: '배송완료' },
]

function OrderTracker({ step }: { step: number }) {
  if (step < 0) return null
  const isComplete = step === TRACKER_STEPS.length - 1
  return (
    <ol
      className={`orders-tracker${isComplete ? ' orders-tracker--complete' : ''}`}
      aria-label="배송 진행 상태"
    >
      {TRACKER_STEPS.map((label, i) => (
        <li
          key={label}
          className={`${i <= step ? 'on' : ''} ${i === step ? 'now' : ''}`.trim()}
          aria-current={i === step ? 'step' : undefined}
        >
          {label}
        </li>
      ))}
    </ol>
  )
}

type OrderCardProps = {
  order: OrderRecord
  onToast: (msg: string) => void
}

function OrderCard({ order, onToast }: OrderCardProps) {
  const detailRef = useRef<HTMLDetailsElement>(null)
  const isCancelled =
    order.status === 'cancelled' || order.status === 'refunded'
  const isDelivered = order.status === 'delivered'
  const trackerStep = isCancelled
    ? -1
    : shouldShowOrderTracker(order.status)
      ? getTrackerStepIndex(order.status)
      : -1
  const badgeLabel = getOrderStatusLabel(order)
  const showInvoice =
    order.status === 'shipping' || order.status === 'delivered'
  let trackingLabel = ''
  if (showInvoice) {
    const carrier = order.shipping.carrier?.trim() ?? ''
    const invoiceNo = order.shipping.tracking_number?.trim() ?? ''
    trackingLabel = [carrier, invoiceNo].filter(Boolean).join(' ')
  }

  const handleTrack = () => {
    if (detailRef.current) detailRef.current.open = true
    if (trackingLabel) {
      onToast(`${trackingLabel} · ${badgeLabel}`)
    } else {
      onToast('운송장 정보가 아직 등록되지 않았습니다.')
    }
  }

  return (
    <article
      className={`orders-card${isCancelled ? ' orders-card--cancel' : ''}${isDelivered ? ' orders-card--delivered' : ''}`}
      id={`order-${order._id}`}
    >
      <header className="orders-card__head">
        <div>
          <div className="orders-card__date">
            {formatOrderDate(order.createdAt)}
            {isNewOrder(order.createdAt) ? (
              <span className="orders-tag-new">NEW</span>
            ) : null}
          </div>
          <div className="orders-card__no">주문번호 {order.order_id}</div>
        </div>
        <span className={orderBadgeClass(order)}>{badgeLabel}</span>
      </header>

      <OrderTracker step={trackerStep} />

      <div className="orders-card__items">
        {order.items.map((item) => (
          <div className="orders-item" key={item._id}>
            {item.image?.url ? (
              <img src={item.image.url} alt="" />
            ) : (
              <div
                className="orders-item__thumb-placeholder"
                style={{
                  width: 72,
                  height: 108,
                  background: '#f2f2f2',
                }}
                aria-hidden
              />
            )}
            <div className="orders-item__meta">
              <div>{item.name}</div>
              <div className="orders-item__qty">
                {formatKrw(item.unit_price)} × {item.quantity}
              </div>
            </div>
            <div className="orders-item__price">
              {formatKrw(item.line_total)}
            </div>
          </div>
        ))}
      </div>

      <div className="orders-total">
        <span className="orders-small-caps">Total</span>
        <strong>{formatKrw(order.total)}</strong>
      </div>

      <details className="orders-detail" ref={detailRef}>
        <summary>ORDER DETAIL</summary>
        <dl className="orders-kv">
          <div>
            <dt>받는 분</dt>
            <dd>{order.shipping.recipient_name}</dd>
          </div>
          <div>
            <dt>연락처</dt>
            <dd>{order.shipping.phone}</dd>
          </div>
          <div>
            <dt>배송지</dt>
            <dd>{formatShippingAddress(order)}</dd>
          </div>
          <div>
            <dt>배송 메모</dt>
            <dd>{order.shipping.memo?.trim() || '—'}</dd>
          </div>
          <div>
            <dt>운송장</dt>
            <dd>{trackingLabel || '—'}</dd>
          </div>
          <div>
            <dt>결제 수단</dt>
            <dd>{formatPaymentMethod(order.payment.method)}</dd>
          </div>
          <div>
            <dt>결제 금액</dt>
            <dd>{formatKrw(order.total)}</dd>
          </div>
        </dl>
      </details>

      {!isCancelled ? (
        <div className="orders-actions">
          {isDelivered ? (
            <>
              <button
                type="button"
                className="orders-btn-sm"
                onClick={handleTrack}
              >
                배송 조회
              </button>
              <button
                type="button"
                className="orders-btn-sm"
                onClick={() => onToast('리뷰 작성 페이지로 이동합니다.')}
              >
                리뷰 작성
              </button>
              <button
                type="button"
                className="orders-btn-sm"
                onClick={() => onToast('1:1 문의 페이지로 이동합니다.')}
              >
                1:1 문의
              </button>
            </>
          ) : (
            <>
              {order.status === 'shipping' ? (
                <button
                  type="button"
                  className="orders-btn-sm"
                  onClick={handleTrack}
                >
                  배송 조회
                </button>
              ) : null}
              <button
                type="button"
                className="orders-btn-sm"
                onClick={() => onToast('1:1 문의 페이지로 이동합니다.')}
              >
                1:1 문의
              </button>
            </>
          )}
        </div>
      ) : null}
    </article>
  )
}

export default function MyOrdersPage() {
  const { sessionUser, clearSession } = useSessionUser()
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<OrderListFilter>('all')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const requireLogin = !sessionUser || !getAccessToken()

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }, [])

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchMyOrders({ page: 1, limit: 50 })
      setOrders(data.orders)
      setTotalCount(data.meta.total)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '주문 목록을 불러오지 못했습니다.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (requireLogin) {
      setLoading(false)
      return
    }
    void loadOrders()
  }, [loadOrders, requireLogin])

  const filtered = useMemo(
    () => orders.filter((o) => orderMatchesFilter(o, filter)),
    [orders, filter]
  )

  if (requireLogin) {
    return (
      <div className="shop-page orders-page">
        <HomeLandingHeader
          sessionUser={sessionUser}
          onLoggedOut={clearSession}
        />
        <div className="orders-wrap">
          <p className="shop-page__message">
            로그인 후 주문 내역을 확인할 수 있습니다.{' '}
            <Link className="shop-page__inline-link" to="/login">
              Login
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="shop-page orders-page">
      <HomeLandingHeader sessionUser={sessionUser} onLoggedOut={clearSession} />

      <main className="orders-wrap">
        <div className="orders-head">
          <div>
            <div className="orders-small-caps">My Page</div>
            <h1 className="orders-page-title">MY ORDERS</h1>
          </div>
          <span className="orders-small-caps">{totalCount} ORDERS</span>
        </div>

        <div
          className="orders-filters"
          role="group"
          aria-label="주문 상태 필터"
        >
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error ? (
          <p className="shop-page__message" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="orders-loading">주문 내역을 불러오는 중입니다…</p>
        ) : filtered.length === 0 ? (
          <p className="orders-empty">해당하는 주문 내역이 없습니다.</p>
        ) : (
          filtered.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              onToast={showToast}
            />
          ))
        )}

        <Link className="orders-btn-line" to="/">
          CONTINUE SHOPPING
        </Link>
      </main>

      <div
        className={`orders-toast${toast ? ' show' : ''}`}
        role="status"
        aria-live="polite"
      >
        {toast ?? ''}
      </div>
    </div>
  )
}