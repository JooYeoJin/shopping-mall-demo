import type { OrderRecord } from '@/types/order'

export type AdminOrdersListMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type AdminOrderUserSnippet = {
  _id: string
  name: string
  email: string
  user_type?: string
}

export type AdminOrderRecord = Omit<OrderRecord, 'user'> & {
  user: AdminOrderUserSnippet | string
}

export type AdminOrderStatusCounts = {
  total: number
  pending: number
  paid: number
  preparing: number
  shipping: number
  delivered: number
  cancel_request: number
  cancel_done: number
}

export type AdminOrderTabId =
  | 'all'
  | 'paid'
  | 'preparing'
  | 'shipping'
  | 'delivered'

export type AdminShippingTabId =
  | 'fulfillment'
  | 'preparing'
  | 'shipping'
  | 'delivered'

export type AdminOrdersListParams = {
  page?: number
  limit?: number
  status?: AdminOrderTabId | AdminShippingTabId
  scope?: 'desk' | 'lookup'
  q?: string
  date_from?: string
  date_to?: string
  payment_method?: string
}

export type AdminOrdersListResult = {
  orders: AdminOrderRecord[]
  meta: AdminOrdersListMeta
  statusCounts: AdminOrderStatusCounts
}