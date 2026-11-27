import { apiGetAuth, apiPatchAuth } from '@/lib/apiAuth'
import type {
  AdminOrderRecord,
  AdminOrdersListParams,
  AdminOrdersListResult,
} from '@/types/adminOrder'

type OrderResponse = { order: AdminOrderRecord }

function buildOrdersQuery(params?: AdminOrdersListParams): string {
  const search = new URLSearchParams()
  const page = params?.page ?? 1
  const limit = params?.limit ?? 15
  search.set('page', String(page))
  search.set('limit', String(limit))
  if (params?.scope) search.set('scope', params.scope)
  if (params?.status && params.status !== 'all') {
    search.set('status', params.status)
  }
  const q = params?.q?.trim()
  if (q) search.set('q', q)
  if (params?.date_from) search.set('date_from', params.date_from)
  if (params?.date_to) search.set('date_to', params.date_to)
  const method = params?.payment_method?.trim()
  if (method && method !== 'all') {
    search.set('payment_method', method)
  }
  return `?${search.toString()}`
}

export async function fetchAdminOrders(
  params?: AdminOrdersListParams
): Promise<AdminOrdersListResult> {
  return apiGetAuth<AdminOrdersListResult>(
    `/api/admin/orders${buildOrdersQuery(params)}`
  )
}

export async function updateAdminOrder(
  orderId: string,
  body: {
    status?: string
    cancel_reason?: string | null
    fulfillment_note?: string | null
    rollback?: boolean
    shipping?: {
      carrier?: string | null
      tracking_number?: string | null
    }
  }
): Promise<AdminOrderRecord> {
  const { order } = await apiPatchAuth<OrderResponse>(
    `/api/admin/orders/${orderId}`,
    body
  )
  return order
}