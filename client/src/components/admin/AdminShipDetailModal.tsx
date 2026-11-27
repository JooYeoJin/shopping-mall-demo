import { useState } from 'react'
import type { AdminOrderRecord } from '@/types/adminOrder'
import { formatKrw } from '@/utils/format'
import {
  adminOrderStatusLabel,
  formatAdminOrderDateTime,
  getAdminOrderCustomerName,
} from '@/utils/adminOrderDisplay'
import {
  SHIPPING_CARRIERS,
  formatShippingAddress,
  getFulfillmentTransitionError,
  previousFulfillmentSteps,
} from '@/utils/adminShippingDisplay'
import { updateAdminOrder } from '@/services/adminOrderService'
import { AdminRollbackModal } from '@/components/admin/AdminRollbackModal'

type Props = {
  order: AdminOrderRecord
  onClose: () => void
  onUpdated: (order: AdminOrderRecord) => void
}

export function AdminShipDetailModal({ order, onClose, onUpdated }: Props) {
  const [carrier, setCarrier] = useState(
    order.status === 'preparing' ? '' : (order.shipping.carrier ?? '')
  )
  const [tracking, setTracking] = useState(
    order.status === 'preparing' ? '' : (order.shipping.tracking_number ?? '')
  )
  const [rollbackOpen, setRollbackOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canEditInvoice = order.status === 'preparing'
  const rollbackOptions = previousFulfillmentSteps(order.status)

  const applyStatus = async (
    status: string,
    extra?: { rollback?: boolean; fulfillment_note?: string }
  ) => {
    const blocked = getFulfillmentTransitionError(
      order,
      status,
      { carrier, tracking_number: tracking },
      { rollback: extra?.rollback }
    )
    if (blocked) {
      window.alert(`처리할 수 없습니다.\n\n${order.order_id}\n${blocked}`)
      return
    }

    setBusy(true)
    setError(null)
    try {
      const body: Parameters<typeof updateAdminOrder>[1] = { status }
      if (extra?.rollback) body.rollback = true
      if (extra?.fulfillment_note) {
        body.fulfillment_note = extra.fulfillment_note
      }
      if (order.status === 'preparing' && status === 'shipping') {
        body.shipping = {
          carrier: carrier.trim() || null,
          tracking_number: tracking.trim() || null,
        }
      }
      const updated = await updateAdminOrder(order._id, body)
      onUpdated(updated)
      onClose()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '배송 정보를 저장하지 못했습니다.'
      )
    } finally {
      setBusy(false)
    }
  }

  const handleRollbackApply = (status: string, reason: string) => {
    void applyStatus(status, {
      rollback: true,
      fulfillment_note: reason || undefined,
    })
  }

  return (
    <>
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !rollbackOpen) onClose()
      }}
    >
      <div
        className="admin-modal"
        role="dialog"
        aria-labelledby="admin-ship-modal-title"
      >
        <div className="admin-modal__head">
          <h2 className="admin-modal__title" id="admin-ship-modal-title">
            출고 처리 · {order.order_id}
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
            <dt>주문일시</dt>
            <dd>{formatAdminOrderDateTime(order.createdAt)}</dd>
          </div>
          <div>
            <dt>현재 상태</dt>
            <dd>{adminOrderStatusLabel(order.status)}</dd>
          </div>
          <div>
            <dt>수령인</dt>
            <dd>{getAdminOrderCustomerName(order)}</dd>
          </div>
          <div>
            <dt>연락처</dt>
            <dd>{order.shipping.phone}</dd>
          </div>
          <div className="admin-product-detail__meta-row--full">
            <dt>배송지</dt>
            <dd>{formatShippingAddress(order)}</dd>
          </div>
          <div className="admin-product-detail__meta-row--full">
            <dt>배송 메모</dt>
            <dd>{order.shipping.memo?.trim() || '—'}</dd>
          </div>
          <div>
            <dt>택배사</dt>
            <dd>
              {canEditInvoice ? (
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  disabled={busy}
                >
                  <option value="">선택</option>
                  {SHIPPING_CARRIERS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                  {carrier &&
                  !SHIPPING_CARRIERS.includes(
                    carrier as (typeof SHIPPING_CARRIERS)[number]
                  ) ? (
                    <option value={carrier}>{carrier}</option>
                  ) : null}
                </select>
              ) : (
                order.shipping.carrier?.trim() || '—'
              )}
            </dd>
          </div>
          <div>
            <dt>송장번호</dt>
            <dd>
              {canEditInvoice ? (
                <input
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  disabled={busy}
                  placeholder="운송장 번호"
                />
              ) : (
                order.shipping.tracking_number?.trim() || '—'
              )}
            </dd>
          </div>
        </dl>

        <ul className="admin-order-items">
          {order.items.map((item) => (
            <li key={item._id} className="admin-order-items__row">
              {item.image?.url ? (
                <img
                  className="admin-table__thumb"
                  src={item.image.url}
                  alt=""
                  width={48}
                  height={48}
                />
              ) : null}
              <div>
                <div>{item.name}</div>
                <div className="admin-order-items__sub">
                  {formatKrw(item.unit_price)} × {item.quantity}
                </div>
              </div>
              <div>{formatKrw(item.line_total)}</div>
            </li>
          ))}
        </ul>

        {error ? <p className="admin-message">{error}</p> : null}

        <div className="admin-modal__actions">
          {order.status === 'preparing' ? (
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              disabled={busy}
              onClick={() => void applyStatus('shipping')}
            >
              출고 (배송중)
            </button>
          ) : null}
          {order.status === 'shipping' ? (
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              disabled={busy}
              onClick={() => void applyStatus('delivered')}
            >
              배송완료
            </button>
          ) : null}
          {rollbackOptions.length > 0 ? (
            <button
              type="button"
              className="admin-btn admin-btn--muted"
              disabled={busy}
              onClick={() => setRollbackOpen(true)}
            >
              단계 되돌리기
            </button>
          ) : null}
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
      {rollbackOpen && rollbackOptions.length > 0 ? (
        <AdminRollbackModal
          orderId={order.order_id}
          options={rollbackOptions}
          busy={busy}
          onClose={() => setRollbackOpen(false)}
          onApply={handleRollbackApply}
        />
      ) : null}
    </>
  )
}
