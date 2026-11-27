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
import { fetchMyCart } from '@/services/cartService'
import { getCartItemCount, type CartRecord } from '@/types/cart'

type CartContextValue = {
  cart: CartRecord | null
  itemCount: number
  loading: boolean
  refreshCart: () => Promise<void>
  setCart: (cart: CartRecord | null) => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [cart, setCart] = useState<CartRecord | null>(null)
  const [loading, setLoading] = useState(false)

  const refreshCart = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setCart(null)
      return
    }
    setLoading(true)
    try {
      const next = await fetchMyCart()
      setCart(next)
    } catch {
      setCart(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshCart()
  }, [refreshCart, location.pathname])

  const itemCount = useMemo(() => getCartItemCount(cart), [cart])

  const value = useMemo(
    () => ({
      cart,
      itemCount,
      loading,
      refreshCart,
      setCart,
    }),
    [cart, itemCount, loading, refreshCart]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider')
  }
  return ctx
}