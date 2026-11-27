import { Link } from 'react-router-dom'
import { HomeLandingHeader } from '@/components/home/HomeLandingHeader'
import { useWishlist } from '@/contexts/WishlistContext'
import { getAccessToken } from '@/lib/authStorage'
import { useSessionUser } from '@/hooks/useSessionUser'
import { removeWishlistProduct } from '@/services/wishlistService'
import { shopProductPath } from '@/types/product'
import { formatKrw } from '@/utils/format'
import './home.css'
import './shop.css'
import './bag.css'
import './wishlist.css'

export default function WishlistPage() {
  const { sessionUser, clearSession } = useSessionUser()
  const { wishlist, setWishlist } = useWishlist()
  const requireLogin = !sessionUser || !getAccessToken()

  const handleRemove = async (productId: string) => {
    try {
      const next = await removeWishlistProduct(productId)
      setWishlist(next)
    } catch {
      /* keep current list */
    }
  }

  if (requireLogin) {
    return (
      <div className="shop-page wishlist-page">
        <HomeLandingHeader
          sessionUser={sessionUser}
          onLoggedOut={clearSession}
        />
        <div className="bag-page__body">
          <p className="shop-page__message">
            로그인 후 위시리스트를 이용할 수 있습니다.{' '}
            <Link className="shop-page__inline-link" to="/login">
              Login
            </Link>
          </p>
        </div>
      </div>
    )
  }

  const items = wishlist?.items ?? []

  return (
    <div className="shop-page wishlist-page">
      <HomeLandingHeader sessionUser={sessionUser} onLoggedOut={clearSession} />

      <div className="bag-page__body">
        <header className="bag-page__head">
          <h1 className="bag-page__title">Wishlist</h1>
        </header>

        {items.length === 0 ? (
          <p className="shop-page__message">
            위시리스트가 비어 있습니다.{' '}
            <Link className="shop-page__inline-link" to="/shop/TOP">
              Shop
            </Link>
          </p>
        ) : (
          <ul className="bag-list">
            {items.map((item) => {
              const product = item.product
              if (!product) return null
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
                    <p className="bag-list__price">{formatKrw(product.price)}</p>
                    <button
                      type="button"
                      className="bag-list__remove"
                      onClick={() => void handleRemove(product._id)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
