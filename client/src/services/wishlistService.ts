import { apiDeleteAuthJson, apiGetAuth, apiPostAuth } from '@/lib/apiAuth'
import type { WishlistRecord } from '@/types/wishlist'

type WishlistResponse = { wishlist: WishlistRecord; wished?: boolean }

export async function fetchMyWishlist(): Promise<WishlistRecord> {
  const { wishlist } = await apiGetAuth<WishlistResponse>('/api/wishlists/me')
  return wishlist
}

export async function toggleWishlistProduct(
  productId: string
): Promise<{ wishlist: WishlistRecord; wished: boolean }> {
  const data = await apiPostAuth<WishlistResponse>('/api/wishlists/me/items', {
    product: productId,
  })
  return { wishlist: data.wishlist, wished: Boolean(data.wished) }
}

export async function removeWishlistProduct(
  productId: string
): Promise<WishlistRecord> {
  const data = await apiDeleteAuthJson<WishlistResponse>(
    `/api/wishlists/me/items/${productId}`
  )
  return data.wishlist
}
