import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import { getAccessToken } from '@/lib/authStorage'
import {
  fetchMyWishlist,
  toggleWishlistProduct,
} from '@/services/wishlistService'
import type { WishlistRecord } from '@/types/wishlist'

type WishlistContextValue = {
  wishlist: WishlistRecord | null
  itemCount: number
  wishedIds: Set<string>
  loading: boolean
  isWished: (productId: string) => boolean
  toggleWish: (productId: string) => Promise<boolean>
  setWishlist: (wishlist: WishlistRecord | null) => void
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [wishlist, setWishlist] = useState<WishlistRecord | null>(null)
  const [loading, setLoading] = useState(false)

  const refreshWishlist = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setWishlist(null)
      return
    }
    setLoading(true)
    try {
      const next = await fetchMyWishlist()
      setWishlist(next)
    } catch {
      setWishlist(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshWishlist()
  }, [refreshWishlist, location.pathname])

  const wishedIds = useMemo(() => {
    const ids = new Set<string>()
    for (const item of wishlist?.items ?? []) {
      if (item.product?._id) ids.add(item.product._id)
    }
    return ids
  }, [wishlist])

  const isWished = useCallback(
    (productId: string) => wishedIds.has(productId),
    [wishedIds]
  )

  const toggleWish = useCallback(async (productId: string) => {
    const { wishlist: next, wished } = await toggleWishlistProduct(productId)
    setWishlist(next)
    return wished
  }, [])

  const value = useMemo(
    () => ({
      wishlist,
      itemCount: wishlist?.items.length ?? 0,
      wishedIds,
      loading,
      isWished,
      toggleWish,
      setWishlist,
    }),
    [wishlist, wishedIds, loading, isWished, toggleWish]
  )

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) {
    throw new Error('useWishlist must be used within WishlistProvider')
  }
  return ctx
}
