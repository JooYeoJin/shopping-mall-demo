import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HomeLandingHeader } from '@/components/home/HomeLandingHeader'
import { useCart } from '@/contexts/CartContext'
import { getAccessToken } from '@/lib/authStorage'
import { useSessionUser } from '@/hooks/useSessionUser'
import {
  clearCartItems,
  removeCartItem,
  updateCartItem,
} from '@/services/cartService'
import { shopProductPath } from '@/types/product'
import { formatKrw } from '@/utils/format'
import './home.css'
import './shop.css'
import './bag.css'

export default function BagPage() {
  const navigate = useNavigate()
  const { sessionUser, clearSession } = useSessionUser()
  const { cart, setCart } = useCart()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const total = cart?.items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  ) ?? 0

  const requireLogin = !sessionUser || !getAccessToken()

  const handleUpdateQty = useCallback(
    async (itemId: string, quantity: number) => {
      if (quantity < 1) return
      setBusyId(itemId)
      setMessage(null)
      try {
        const next = await updateCartItem(itemId, quantity)
        setCart(next)
      } catch (err) {
        setMessage(
          err instanceof Error ? err.message : '수량 변경에 실패했습니다.'
        )
      } finally {
        setBusyId(null)
      }
    },
    [setCart]
  )

  const handleRemove = async (itemId: string) => {
    setBusyId(itemId)
    setMessage(null)
    try {
      const next = await removeCartItem(itemId)
      setCart(next)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    } finally {
      setBusyId(null)
    }
  }

  const handleClear = async () => {
    setMessage(null)
    try {
      const next = await clearCartItems()
      setCart(next)
      setMessage('장바구니를 비웠습니다.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '비우기에 실패했습니다.')
    }
  }

  if (requireLogin) {
    return (
      <div className="shop-page bag-page">
        <HomeLandingHeader
          sessionUser={sessionUser}
          onLoggedOut={clearSession}
        />
        <div className="bag-page__body">
          <p className="shop-page__message">
            로그인 후 장바구니를 이용할 수 있습니다.{' '}
            <Link className="shop-page__inline-link" to="/login">
              Login
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="shop-page bag-page">
      <HomeLandingHeader sessionUser={sessionUser} onLoggedOut={clearSession} />

      <div className="bag-page__body">
        <header className="bag-page__head">
          <h1 className="bag-page__title">Bag</h1>
          {cart && cart.items.length > 0 ? (
            <button
              type="button"
              className="bag-page__clear"
              onClick={() => void handleClear()}
            >
              Clear all
            </button>
          ) : null}
        </header>

        {message ? (
          <p className="shop-page__message" role="status">
            {message}
          </p>
        ) : null}

        {!cart || cart.items.length === 0 ? (
          <p className="shop-page__message">
            장바구니가 비어 있습니다.{' '}
            <Link className="shop-page__inline-link" to="/shop/TOP">
              Shop
            </Link>
          </p>
        ) : (
          <>
            <ul className="bag-list">
              {cart.items.map((item) => {
                const product = item.product
                const disabled = busyId === item._id
                return (
                  <li key={item._id} className="bag-list__item">
                    <Link
                      className="bag-list__thumb"
                      to={shopProductPath(product._id)}
                    >
                      <img src={product.image.url} alt={product.name} />
                    </Link>
                    <div className="bag-list__info">
                      <Link
                        className="bag-list__name"
                        to={shopProductPath(product._id)}
                      >
                        {product.name}
                      </Link>
                      <p className="bag-list__price">
                        {formatKrw(item.unit_price)}
                      </p>
                      <div className="bag-list__qty">
                        <button
                          type="button"
                          disabled={disabled || item.quantity <= 1}
                          onClick={() =>
                            void handleUpdateQty(item._id, item.quantity - 1)
                          }
                          aria-label="수량 감소"
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() =>
                            void handleUpdateQty(item._id, item.quantity + 1)
                          }
                          aria-label="수량 증가"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="bag-list__remove"
                        disabled={disabled}
                        onClick={() => void handleRemove(item._id)}
                      >
                        Remove
                      </button>
                    </div>
                    <p className="bag-list__line-total">
                      {formatKrw(item.unit_price * item.quantity)}
                    </p>
                  </li>
                )
              })}
            </ul>
            <footer className="bag-page__footer">
              <p className="bag-page__total">
                <strong>TOTAL</strong> {formatKrw(total)}
              </p>
              <div className="bag-page__actions">
                <button
                  type="button"
                  className="product-detail__buy product-detail__buy--primary"
                  onClick={() => navigate('/checkout')}
                >
                  결제하기
                </button>
                <button
                  type="button"
                  className="product-detail__buy"
                  onClick={() => navigate('/')}
                >
                  Continue shopping
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}