import type { OrderItemRecord } from '@/types/order'
import type { AdminOrderRecord, AdminOrderUserSnippet } from '@/types/adminOrder'

export const ADMIN_ORDER_LOOKUP_TABS = [
  { id: 'all', label: '전체', countKey: 'total' },
  { id: 'paid', label: '결제완료', countKey: 'paid' },
  { id: 'preparing', label: '상품준비중', countKey: 'preparing' },
  { id: 'shipping', label: '배송중', countKey: 'shipping' },
  { id: 'delivered', label: '배송완료', countKey: 'delivered' },
] as const

export const ADMIN_ORDER_TABS = ADMIN_ORDER_LOOKUP_TABS

export const ADMIN_ORDER_STATUS_OPTIONS = [
  { value: 'pending', label: '결제대기' },
  { value: 'paid', label: '결제완료' },
  { value: 'preparing', label: '상품준비중' },
  { value: 'shipping', label: '배송중' },
  { value: 'delivered', label: '배송완료' },
  { value: 'cancelled', label: '취소완료' },
  { value: 'refunded', label: '환불완료' },
] as const

/** 주문 관리에서 바꾸는 상태. 출고·배송완료는 배송 관리에서 처리 */
export const ADMIN_ORDER_DESK_STATUS_OPTIONS = ADMIN_ORDER_STATUS_OPTIONS.filter(
  (opt) =>
    opt.value !== 'shipping' &&
    opt.value !== 'delivered' &&
    opt.value !== 'pending' &&
    opt.value !== 'cancelled' &&
    opt.value !== 'refunded'
)

export function formatAdminOrderDateTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatAdminPaymentMethod(method: string | null | undefined): string {
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

export function getAdminOrderCustomerName(order: AdminOrderRecord): string {
  const shippingName = order.shipping.recipient_name?.trim()
  if (shippingName) return shippingName
  const user = order.user
  if (user && typeof user === 'object') {
    return (user as AdminOrderUserSnippet).name
  }
  return '—'
}

export function summarizeOrderItems(items: OrderItemRecord[]): {
  title: string
  totalQty: number
  thumbUrl: string | null
} {
  if (items.length === 0) {
    return { title: '—', totalQty: 0, thumbUrl: null }
  }
  const first = items[0]
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0)
  const title =
    items.length === 1
      ? first.name
      : `${first.name} 외 ${items.length - 1}건`
  return {
    title,
    totalQty,
    thumbUrl: first.image?.url ?? null,
  }
}

export function adminOrderStatusLabel(status: string): string {
  return (
    ADMIN_ORDER_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
  )
}