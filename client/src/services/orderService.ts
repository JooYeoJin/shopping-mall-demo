import { apiGetAuth, apiPatchAuth, apiPostAuth } from '@/lib/apiAuth'
import type {
  CreateOrderShippingPayload,
  OrderRecord,
  PaymentMethod,
  PortOneOrderPayload,
} from '@/types/order'

type OrderResponse = { order: OrderRecord }

export type OrdersListMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type OrdersListResponse = {
  orders: OrderRecord[]
  meta: OrdersListMeta
}

type ValidatePaymentResponse = {
  valid: boolean
  portone?: PortOneOrderPayload
}

const API_MESSAGE_KO: Record<string, string> = {
  'Authentication required': '로그인이 필요합니다.',
  'Cart is empty': '장바구니가 비어 있습니다.',
  'shipping.recipient_name, shipping.phone, and shipping.address are required':
    '수령인, 연락처, 주소는 필수입니다.',
  'Validation failed': '입력값을 확인해 주세요.',
  'Payment amount mismatch': '결제 금액이 주문 금액과 일치하지 않습니다.',
  'portone.imp_uid is required': '결제 정보(imp_uid)가 없습니다.',
  'expected_total must be a non-negative number': '주문 금액 정보가 올바르지 않습니다.',
  'Order already exists for this payment':
    '이미 처리된 결제입니다. 주문내역에서 확인해 주세요.',
  'order_id already exists':
    '주문을 다시 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  'Payment already recorded for this transaction':
    '이미 처리된 결제입니다. 주문내역에서 확인해 주세요.',
  'Payment already started for this merchant_uid':
    '이미 시작된 결제가 있습니다. 잠시 후 다시 시도해 주세요.',
  'Order is already cancelled': '이미 취소된 주문입니다. 결제금은 환불됩니다.',
  'merchant_uid does not match this order': '결제 정보가 주문과 일치하지 않습니다.',
  '주문 저장에 실패해 결제를 자동 취소했습니다.':
    '주문 저장에 실패해 결제를 자동 취소했습니다. 카드 승인 취소까지 잠시 걸릴 수 있습니다.',
  '주문 저장에 실패했습니다. 결제 상태를 주문내역에서 확인해 주세요.':
    '주문 저장에 실패했습니다. 주문내역에서 상태를 확인해 주세요.',
  'Payment is not completed (status: unknown)': '결제가 완료되지 않았습니다.',
  'merchant_uid does not match PortOne payment record':
    '결제 정보가 일치하지 않습니다.',
  'Failed to verify payment with PortOne':
    '결제 검증에 실패했습니다. 잠시 후 다시 시도해 주세요.',
  '존재하지 않는 결제정보입니다.':
    '포트원에서 결제 내역을 찾지 못했습니다. 가맹점 식별코드와 서버 REST API 키가 같은 계정인지 확인하세요.',
  'PortOne REST could not find this payment. Check that VITE_PORTONE_IMP_CODE matches PORTONE_API_KEY/SECRET (same merchant).':
    '포트원에서 결제 내역을 찾지 못했습니다. 클라이언트 가맹점 식별코드(VITE_PORTONE_IMP_CODE)와 서버 REST API Key/Secret이 같은 계정인지 확인하세요.',
  'Order not found': '주문을 찾을 수 없습니다.',
  'Order cannot be cancelled in status: preparing':
    '상품 준비가 시작되어 취소할 수 없습니다.',
  'Order cannot be cancelled in status: shipping':
    '배송 중인 주문은 취소할 수 없습니다.',
  'Order cannot be cancelled in status: delivered':
    '배송 완료된 주문은 취소할 수 없습니다.',
}

function translateCancelMessage(message: string): string {
  if (API_MESSAGE_KO[message]) return API_MESSAGE_KO[message]
  const match = message.match(/^Order cannot be cancelled in status: (.+)$/)
  if (match) {
    return `현재 상태(${match[1]})에서는 주문을 취소할 수 없습니다.`
  }
  return translateApiMessage(message)
}

function translateApiMessage(message: string): string {
  if (API_MESSAGE_KO[message]) return API_MESSAGE_KO[message]
  if (message.startsWith('Payment is not completed')) {
    return '결제가 완료되지 않았습니다.'
  }
  return message
}

function throwOrderError(err: unknown): never {
  if (err instanceof Error) {
    throw new Error(translateApiMessage(err.message))
  }
  throw err
}

export type CreateOrderPayload = {
  shipping: CreateOrderShippingPayload
  payment_method?: PaymentMethod
  clear_cart?: boolean
  portone?: PortOneOrderPayload
  /** 장바구니 합계(원). portone 결제 검증에 사용 */
  expected_total?: number
}

/** imp_uid·merchant_uid 기준 주문 중복 여부 확인 + 포트원 결제 검증 */
export async function validateOrderPayment(
  portone: PortOneOrderPayload,
  expectedTotal: number
): Promise<PortOneOrderPayload> {
  try {
    const data = await apiPostAuth<ValidatePaymentResponse>(
      '/api/orders/me/payment/validate',
      {
        portone,
        expected_total: expectedTotal,
      }
    )
    return data.portone ?? portone
  } catch (err) {
    throwOrderError(err)
  }
}

export async function fetchMyOrders(params?: {
  page?: number
  limit?: number
  status?: string
}): Promise<OrdersListResponse> {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.limit) search.set('limit', String(params.limit))
  if (params?.status) search.set('status', params.status)
  const qs = search.toString()
  const path = qs ? `/api/orders/me?${qs}` : '/api/orders/me'
  try {
    return await apiGetAuth<OrdersListResponse>(path)
  } catch (err) {
    throwOrderError(err)
  }
}

export async function cancelMyOrder(
  orderId: string,
  cancelReason?: string
): Promise<OrderRecord | null> {
  try {
    const data = await apiPatchAuth<OrderResponse & { discarded?: boolean }>(
      `/api/orders/me/${orderId}/cancel`,
      cancelReason ? { cancel_reason: cancelReason } : {}
    )
    if (data.discarded || !data.order) return null
    return data.order
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(translateCancelMessage(err.message))
    }
    throw err
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchMyOrder(orderMongoId: string): Promise<OrderRecord> {
  try {
    const { order } = await apiGetAuth<OrderResponse>(
      `/api/orders/me/${orderMongoId}`
    )
    return order
  } catch (err) {
    throwOrderError(err)
  }
}

export type PrepareCheckoutPayload = {
  shipping: CreateOrderShippingPayload
  payment_method?: PaymentMethod
}

export async function prepareMyCheckout(
  payload: PrepareCheckoutPayload
): Promise<{ order: OrderRecord; merchant_uid: string; amount: number }> {
  try {
    return await apiPostAuth<{
      order: OrderRecord
      merchant_uid: string
      amount: number
    }>('/api/orders/me/prepare', payload)
  } catch (err) {
    throwOrderError(err)
  }
}

async function pollUntilPaid(orderMongoId: string): Promise<OrderRecord | null> {
  for (let i = 0; i < 6; i += 1) {
    await sleep(700 * (i + 1))
    try {
      const order = await fetchMyOrder(orderMongoId)
      if (order.payment?.status === 'paid' || order.status === 'paid') {
        return order
      }
      if (order.status === 'cancelled' || order.status === 'refunded') {
        return order
      }
    } catch {
      /* retry */
    }
  }
  return null
}

export async function confirmMyCheckout(
  orderMongoId: string,
  portone: PortOneOrderPayload
): Promise<OrderRecord> {
  let lastErr: unknown
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const data = await apiPostAuth<{
        order: OrderRecord
        verifying?: boolean
        already?: boolean
      }>(`/api/orders/me/${orderMongoId}/confirm`, { portone })

      if (data.verifying) {
        const polled = await pollUntilPaid(orderMongoId)
        if (polled && (polled.status === 'paid' || polled.payment?.status === 'paid')) {
          return polled
        }
        throw new Error(
          '결제는 접수됐지만 확인이 지연되고 있습니다. 주문내역에서 상태를 확인해 주세요.'
        )
      }

      return data.order
    } catch (err) {
      lastErr = err
      const msg = err instanceof Error ? err.message : ''
      const retryable =
        /failed to verify|확인이 지연|internal server|network|failed to fetch|econnrefused/i.test(
          msg
        )
      if (!retryable) break
      if (attempt < 3) {
        await sleep(400 * (attempt + 1))
      }
    }
  }

  const polled = await pollUntilPaid(orderMongoId)
  if (polled && (polled.status === 'paid' || polled.payment?.status === 'paid')) {
    return polled
  }

  if (lastErr) throwOrderError(lastErr)
  throw new Error(
    '결제 확인에 실패했습니다. 주문내역에서 상태를 확인해 주세요.'
  )
}

/** 주문 생성 (선행: portone 시 중복·결제 검증) */
export async function createMyOrder(
  payload: CreateOrderPayload
): Promise<OrderRecord> {
  let portone = payload.portone

  if (portone) {
    const expectedTotal =
      payload.expected_total ?? portone.paid_amount ?? undefined
    if (expectedTotal === undefined || !Number.isFinite(expectedTotal)) {
      throw new Error('주문 금액이 없어 결제를 검증할 수 없습니다.')
    }
    portone = await validateOrderPayment(portone, expectedTotal)
  }

  try {
    const { order } = await apiPostAuth<OrderResponse>('/api/orders/me', {
      shipping: payload.shipping,
      payment_method: payload.payment_method ?? 'mock',
      clear_cart: payload.clear_cart ?? true,
      portone,
    })
    return order
  } catch (err) {
    throwOrderError(err)
  }
}