import {
  apiDeleteAuthJson,
  apiGetAuth,
  apiPatchAuth,
  apiPostAuth,
} from '@/lib/apiAuth'
import type { CartRecord } from '@/types/cart'

type CartResponse = { cart: CartRecord }

export async function fetchMyCart(): Promise<CartRecord> {
  const { cart } = await apiGetAuth<CartResponse>('/api/carts/me')
  return cart
}

export async function addCartItem(
  productId: string,
  quantity: number
): Promise<CartRecord> {
  const { cart } = await apiPostAuth<CartResponse>('/api/carts/me/items', {
    product: productId,
    quantity,
  })
  return cart
}

export async function updateCartItem(
  itemId: string,
  quantity: number
): Promise<CartRecord> {
  const { cart } = await apiPatchAuth<CartResponse>(
    `/api/carts/me/items/${itemId}`,
    { quantity }
  )
  return cart
}

export async function removeCartItem(itemId: string): Promise<CartRecord> {
  const { cart } = await apiDeleteAuthJson<CartResponse>(
    `/api/carts/me/items/${itemId}`
  )
  return cart
}

export async function clearCartItems(): Promise<CartRecord> {
  const { cart } = await apiDeleteAuthJson<CartResponse>('/api/carts/me/items')
  return cart
}