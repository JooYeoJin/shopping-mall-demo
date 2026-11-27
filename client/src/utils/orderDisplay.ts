import type { OrderRecord } from '@/types/order'

/** 주문 직후(paid)부터 배송완료까지 4단계 */
export const TRACKER_STEPS = [
  '결제완료',
  '상품준비중',
  '배송중',
  '배송완료',
] as const

export type OrderListFilter =
  | 'all'
  | 'paid'
  | 'preparing'
  | 'shipping'
  | 'delivered'

export function orderMatchesFilter(
  order: OrderRecord,
  filter: OrderListFilter
): boolean {
  if (order.status === 'cancelled' || order.status === 'refunded') {
    return false
  }
  if (filter === 'all') return true
  if (filter === 'paid') {
    return order.status === 'paid' || order.status === 'pending'
  }
  return order.status === filter
}

export function shouldShowOrderTracker(status: string): boolean {
  return getTrackerStepIndex(status) >= 0
}

export function getTrackerStepIndex(status: string): number {
  switch (status) {
    case 'pending':
    case 'paid':
      return 0
    case 'preparing':
      return 1
    case 'shipping':
      return 2
    case 'delivered':
      return 3
    default:
      return -1
  }
}

export function getOrderStatusLabel(order: OrderRecord): string {
  if (order.status === 'cancelled') return '주문취소'
  if (order.status === 'refunded') return '환불완료'
  if (order.status === 'pending' && order.payment?.status === 'pending') {
    return '결제대기'
  }
  const step = getTrackerStepIndex(order.status)
  if (step >= 0) return TRACKER_STEPS[step]
  return order.status
}

export function orderBadgeClass(order: OrderRecord): string {
  if (order.status === 'cancelled' || order.status === 'refunded') {
    return 'orders-badge orders-badge--cancel'
  }
  if (order.status === 'delivered') return 'orders-badge orders-badge--done'
  return 'orders-badge'
}

export function formatOrderDate(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

export function isNewOrder(createdAt: string, withinHours = 48): boolean {
  const created = new Date(createdAt).getTime()
  const cutoff = Date.now() - withinHours * 60 * 60 * 1000
  return created >= cutoff
}

export function formatPaymentMethod(method: string | null | undefined): string {
  switch (method) {
    case 'card':
      return '신용카드'
    case 'transfer':
      return '실시간 계좌이체'
    case 'easy':
    case 'mock':
      return '간편결제'
    default:
      return method ?? '—'
  }
}

export function formatShippingAddress(order: OrderRecord): string {
  const { shipping } = order
  const parts = [
    shipping.postal_code ? `(${shipping.postal_code})` : '',
    shipping.address,
    shipping.address_detail ?? '',
  ].filter(Boolean)
  return parts.join(' ').trim() || '—'
}