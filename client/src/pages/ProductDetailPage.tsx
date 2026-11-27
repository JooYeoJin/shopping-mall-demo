import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { HomeLandingHeader } from '@/components/home/HomeLandingHeader'
import { ProductDetailAccordion } from '@/components/shop/ProductDetailAccordion'
import {
  PRODUCT_DETAIL_NOTICE,
  PRODUCT_DETAIL_SHIPPING,
  PRODUCT_DETAIL_SIZE_GUIDE,
} from '@/config/productDetailContent'
import { useCart } from '@/contexts/CartContext'
import { useWishlist } from '@/contexts/WishlistContext'
import { getAccessToken } from '@/lib/authStorage'
import { useSessionUser } from '@/hooks/useSessionUser'
import { addCartItem } from '@/services/cartService'
import { fetchProductById } from '@/services/productService'
import {
  getProductCategoryLabel,
  shopCategoryPath,
  toApiCategory,
  type ProductRecord,
} from '@/types/product'
import { formatKrw, formatNumber } from '@/utils/format'
import './home.css'
import './shop.css'
import './product-detail.css'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { sessionUser, clearSession } = useSessionUser()
  const { setCart } = useCart()
  const { isWished, toggleWish } = useWishlist()

  const [product, setProduct] = useState<ProductRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(0)
  const [bagMessage, setBagMessage] = useState<string | null>(null)
  const [addingToBag, setAddingToBag] = useState(false)

  const loadProduct = useCallback(async (productId: string) => {
    setError(null)
    setLoading(true)
    try {
      const record = await fetchProductById(productId)
      setProduct(record)
      setQuantity(0)
    } catch (err) {
      setProduct(null)
      setError(
        err instanceof Error ? err.message : '상품을 불러오지 못했습니다.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!id?.trim()) {
      setLoading(false)
      setError('상품을 찾을 수 없습니다.')
      return
    }
    void loadProduct(id.trim())
  }, [id, loadProduct])

  const points = useMemo(() => {
    if (!product) return 0
    return Math.floor(product.price * 0.01)
  }, [product])

  const lineTotal = product ? product.price * quantity : 0

  const categoryLink = useMemo(() => {
    if (!product) return '/'
    const api = toApiCategory(product.category)
    return api ? shopCategoryPath(api) : '/'
  }, [product])

  const accordionItems = useMemo(() => {
    if (!product) return []
    const details = product.description?.trim()
      ? product.description.trim()
      : '상품 상세 설명이 준비 중입니다.'
    return [
      { id: 'details', title: 'DETAILS', content: <p>{details}</p> },
      {
        id: 'size',
        title: 'SIZE GUIDE',
        content: <p>{PRODUCT_DETAIL_SIZE_GUIDE}</p>,
      },
      {
        id: 'shipping',
        title: 'SHIPPING',
        content: <p>{PRODUCT_DETAIL_SHIPPING}</p>,
      },
      {
        id: 'notice',
        title: 'NOTICE',
        content: <p>{PRODUCT_DETAIL_NOTICE}</p>,
      },
    ]
  }, [product])

  const changeQuantity = (delta: number) => {
    setBagMessage(null)
    setQuantity((prev) => Math.max(0, prev + delta))
  }

  const wished = product ? isWished(product._id) : false

  const handleToggleWish = async () => {
    if (!product) return
    if (!sessionUser || !getAccessToken()) {
      navigate('/login', {
        state: {
          from: location.pathname,
          loginMessage: '로그인 후 위시리스트에 담을 수 있습니다.',
        },
      })
      return
    }
    try {
      await toggleWish(product._id)
    } catch (err) {
      setBagMessage(
        err instanceof Error ? err.message : '위시리스트에 담지 못했습니다.'
      )
    }
  }

  const handleAddToBag = async () => {
    if (!product || quantity < 1) return

    if (!sessionUser || !getAccessToken()) {
      navigate('/login', {
        state: { from: location.pathname, loginMessage: '로그인 후 장바구니에 담을 수 있습니다.' },
      })
      return
    }

    setAddingToBag(true)
    setBagMessage(null)
    try {
      const cart = await addCartItem(product._id, quantity)
      setCart(cart)
      setBagMessage('장바구니에 담았습니다.')
      setQuantity(0)
    } catch (err) {
      setBagMessage(
        err instanceof Error ? err.message : '장바구니에 담지 못했습니다.'
      )
    } finally {
      setAddingToBag(false)
    }
  }

  return (
    <div className="shop-page product-detail-page">
      <HomeLandingHeader sessionUser={sessionUser} onLoggedOut={clearSession} />

      <div className="product-detail__body">
        {loading ? (
          <p className="shop-page__message shop-page__message--loading">
            불러오는 중…
          </p>
        ) : null}

        {error ? (
          <p className="shop-page__message">
            {error}{' '}
            <Link className="shop-page__inline-link" to="/">
              메인으로
            </Link>
          </p>
        ) : null}

        {!loading && !error && product ? (
          <article className="product-detail">
            <div className="product-detail__gallery">
              <img src={product.image.url} alt={product.name} />
            </div>

            <div className="product-detail__info">
              <p className="product-detail__category">
                <Link to={categoryLink}>
                  {getProductCategoryLabel(product.category)}
                </Link>
              </p>
              <h1 className="product-detail__title">{product.name}</h1>
              <p className="product-detail__price">{formatKrw(product.price)}</p>
              <p className="product-detail__points">
                {formatNumber(points)} P (1%)
              </p>

              <div className="product-detail__line">
                <span className="product-detail__line-name">{product.name}</span>
                <div className="product-detail__qty" aria-label="수량">
                  <button
                    type="button"
                    onClick={() => changeQuantity(-1)}
                    disabled={quantity <= 0}
                    aria-label="수량 감소"
                  >
                    −
                  </button>
                  <span>{quantity}</span>
                  <button
                    type="button"
                    onClick={() => changeQuantity(1)}
                    aria-label="수량 증가"
                  >
                    +
                  </button>
                </div>
                <span className="product-detail__line-price">
                  {formatKrw(product.price)}
                </span>
              </div>

              <p className="product-detail__total">
                <strong>TOTAL:</strong> {formatKrw(lineTotal)} ({quantity}개)
              </p>

              {bagMessage ? (
                <p className="product-detail__bag-msg" role="status">
                  {bagMessage}
                  {bagMessage.includes('담았') ? (
                    <>
                      {' '}
                      <Link to="/bag">Bag</Link>
                    </>
                  ) : null}
                </p>
              ) : null}

              <div className="product-detail__actions">
                <button
                  type="button"
                  className="product-detail__buy"
                  disabled={quantity < 1 || addingToBag}
                  onClick={() => void handleAddToBag()}
                >
                  {addingToBag
                    ? 'ADDING…'
                    : quantity < 1
                      ? 'SELECT QUANTITY'
                      : 'ADD TO BAG'}
                </button>
                <button
                  type="button"
                  className={`product-detail__wish${
                    wished ? ' product-detail__wish--on' : ''
                  }`}
                  aria-label={
                    wished ? '위시리스트에서 삭제' : '위시리스트에 담기'
                  }
                  aria-pressed={wished}
                  onClick={() => void handleToggleWish()}
                >
                  {wished ? '♥' : '♡'}
                </button>
              </div>

              <ProductDetailAccordion items={accordionItems} />
            </div>
          </article>
        ) : null}
      </div>
    </div>
  )
}