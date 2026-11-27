import type { ProductImage } from '@/types/product'

export type CartProductSnapshot = {
  _id: string
  product_id: string
  name: string
  price: number
  image: ProductImage
  category: string
}

export type CartItemRecord = {
  _id: string
  quantity: number
  unit_price: number
  product: CartProductSnapshot
}

export type CartRecord = {
  _id: string
  user: string
  items: CartItemRecord[]
  createdAt: string
  updatedAt: string
}

export function getCartItemCount(cart: CartRecord | null | undefined): number {
  if (!cart?.items?.length) return 0
  return cart.items.reduce((sum, item) => sum + item.quantity, 0)
}