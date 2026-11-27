import type { AdminOrderRecord, AdminShippingTabId } from '@/types/adminOrder'

export const SHIPPING_CARRIERS = [
  'CJ대한통운',
  '한진택배',
  '롯데택배',
  '우체국택배',
  '로젠택배',
  '대신택배',
] as const

export const ADMIN_SHIPPING_TABS: {
  id: AdminShippingTabId
  label: string
  countKey: 'fulfillment' | 'preparing' | 'shipping' | 'delivered'
}[] = [
  { id: 'fulfillment', label: '전체', countKey: 'fulfillment' },
  { id: 'preparing', label: '상품준비중', countKey: 'preparing' },
  { id: 'shipping', label: '배송중', countKey: 'shipping' },
  { id: 'delivered', label: '배송완료', countKey: 'delivered' },
]

export function formatShippingAddress(order: AdminOrderRecord): string {
  return [order.shipping.postal_code, order.shipping.address, order.shipping.address_detail]
    .filter(Boolean)
    .join(' ')
}

export const FULFILLMENT_STEPS = [
  'paid',
  'preparing',
  'shipping',
  'delivered',
] as const

export const FULFILLMENT_STEP_LABEL: Record<
  (typeof FULFILLMENT_STEPS)[number],
  string
> = {
  paid: '결제완료 (주문 관리)',
  preparing: '상품준비중',
  shipping: '배송중',
  delivered: '배송완료',
}

export function hasInvoice(order: AdminOrderRecord): boolean {
  return Boolean(
    order.shipping.carrier?.trim() && order.shipping.tracking_number?.trim()
  )
}

export function previousFulfillmentSteps(
  status: string
): { value: string; label: string }[] {
  const from = FULFILLMENT_STEPS.indexOf(
    status as (typeof FULFILLMENT_STEPS)[number]
  )
  if (from <= 0) return []
  return FULFILLMENT_STEPS.slice(0, from).map((value) => ({
    value,
    label: value === 'paid' ? '결제완료' : FULFILLMENT_STEP_LABEL[value],
  }))
}

export function getFulfillmentTransitionError(
  order: AdminOrderRecord,
  nextStatus: string,
  invoice?: { carrier?: string; tracking_number?: string },
  options?: { rollback?: boolean }
): string | null {
  if (!nextStatus || nextStatus === order.status) return null

  const carrier = invoice?.carrier ?? order.shipping.carrier
  const tracking = invoice?.tracking_number ?? order.shipping.tracking_number
  const invoiceOk = Boolean(carrier?.trim() && tracking?.trim())

  if (nextStatus === 'cancelled' || nextStatus === 'refunded') return null

  const from = FULFILLMENT_STEPS.indexOf(
    order.status as (typeof FULFILLMENT_STEPS)[number]
  )
  const to = FULFILLMENT_STEPS.indexOf(
    nextStatus as (typeof FULFILLMENT_STEPS)[number]
  )
  if (from < 0 || to < 0) return null

  if (to === from + 1) {
    if (nextStatus === 'shipping' && !invoiceOk) {
      return '배송중으로 바꾸려면 택배사와 송장번호가 필요합니다.'
    }
    return null
  }

  if (to > from + 1) {
    return '단계를 건너뛸 수 없습니다. 바로 다음 단계로만 진행할 수 있습니다.'
  }

  if (to < from) {
    if (nextStatus === 'paid') return null
    if (!options?.rollback) {
      return '이전 단계로 되돌리려면 배송 상세에서 단계 되돌리기를 사용해 주세요.'
    }
    return null
  }

  return null
}

export function alertFulfillmentErrors(
  errors: { orderId: string; message: string }[]
): void {
  if (errors.length === 0) return
  const body = errors
    .map((item) => `${item.orderId}\n${item.message}`)
    .join('\n\n')
  window.alert(`처리할 수 없습니다.\n\n${body}`)
}
