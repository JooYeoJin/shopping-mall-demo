import { useState } from 'react'
import type { AdminOrderRecord } from '@/types/adminOrder'
import { formatKrw } from '@/utils/format'
import {
  adminOrderStatusLabel,
  formatAdminOrderDateTime,
  formatAdminPaymentMethod,
  getAdminOrderCustomerName,
} from '@/utils/adminOrderDisplay'
import { updateAdminOrder } from '@/services/adminOrderService'
import { getFulfillmentTransitionError } from '@/utils/adminShippingDisplay'

type Props = {
  order: AdminOrderRecord
  readOnly?: boolean
  onClose: () => void
  onUpdated?: (order: AdminOrderRecord) => void
}

export function AdminOrderDetailModal({
  order,
  readOnly = false,
  onClose,
  onUpdated,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const invoiceVisible =
    order.status === 'shipping' || order.status === 'delivered'
  const invoiceText = invoiceVisible
    ? {
        carrier: order.shipping.carrier?.trim() || '—',
        tracking: order.shipping.tracking_number?.trim() || '—',
      }
    : { carrier: '—', tracking: '—' }

  const applyStatus = async (status: string) => {
    const blocked = getFulfillmentTransitionError(order, status)
    if (blocked) {
      window.alert(`처리할 수 없습니다.\n\n${order.order_id}\n${blocked}`)
      return
    }

    setBusy(true)
    setError(null)
    try {
      const updated = await updateAdminOrder(order._id, { status })
      onUpdated?.(updated)
      onClose()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '주문 정보를 저장하지 못했습니다.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div
        className="admin-modal-backdrop"
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div
          className="admin-modal"
          role="dialog"
          aria-labelledby="admin-order-modal-title"
        >
          <div className="admin-modal__head">
            <h2 className="admin-modal__title" id="admin-order-modal-title">
              주문 상세 · {order.order_id}
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
              <dt>주문자</dt>
              <dd>{getAdminOrderCustomerName(order)}</dd>
            </div>
            <div>
              <dt>연락처</dt>
              <dd>{order.shipping.phone}</dd>
            </div>
            <div>
              <dt>결제금액</dt>
              <dd>{formatKrw(order.total)}</dd>
            </div>
            <div>
              <dt>결제수단</dt>
              <dd>{formatAdminPaymentMethod(order.payment.method)}</dd>
            </div>
            <div>
              <dt>현재 상태</dt>
              <dd>{adminOrderStatusLabel(order.status)}</dd>
            </div>
            <div className="admin-product-detail__meta-row--full">
              <dt>배송지</dt>
              <dd>
                {[
                  order.shipping.postal_code,
                  order.shipping.address,
                  order.shipping.address_detail,
                ]
                  .filter(Boolean)
                  .join(' ')}
              </dd>
            </div>
            <div>
              <dt>택배사</dt>
              <dd>{invoiceText.carrier}</dd>
            </div>
            <div>
              <dt>송장번호</dt>
              <dd>{invoiceText.tracking}</dd>
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
            {!readOnly && order.status === 'paid' ? (
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={busy}
                onClick={() => void applyStatus('preparing')}
              >
                상품준비중으로 넘기기
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

    </>
  )
}
