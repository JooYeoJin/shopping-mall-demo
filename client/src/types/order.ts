export type OrderShipping = {
  recipient_name: string
  phone: string
  postal_code?: string | null
  address: string
  address_detail?: string | null
  memo?: string | null
  carrier?: string | null
  tracking_number?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
}

export type OrderItemRecord = {
  _id: string
  product: string
  product_id: string
  name: string
  image: { url: string }
  category: string
  quantity: number
  unit_price: number
  line_total: number
}

export type OrderPayment = {
  status: string
  method: string | null
  paid_at: string | null
  transaction_id: string | null
  merchant_uid?: string | null
}

export type OrderRecord = {
  _id: string
  order_id: string
  user: string
  items: OrderItemRecord[]
  total: number
  status: string
  payment: OrderPayment
  shipping: OrderShipping
  cancelled_at?: string | null
  cancel_reason?: string | null
  fulfillment_note?: string | null
  createdAt: string
  updatedAt: string
}

export type CreateOrderShippingPayload = {
  recipient_name: string
  phone: string
  postal_code?: string
  address: string
  address_detail?: string
  memo?: string
}

export type PaymentMethod = 'mock' | 'easy' | 'card' | 'transfer'

export type PortOneOrderPayload = {
  imp_uid: string
  merchant_uid: string
  paid_amount: number
  status: string
}