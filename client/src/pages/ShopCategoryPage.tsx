import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { HomeLandingHeader } from '@/components/home/HomeLandingHeader'
import { useSessionUser } from '@/hooks/useSessionUser'
import { fetchProducts } from '@/services/productService'
import {
  parseProductCategory,
  SHOP_CATEGORY_OPTIONS,
  shopCategoryPath,
  shopProductPath,
  type ProductCategory,
  type ProductPagination,
  type ProductRecord,
} from '@/types/product'
import { formatKrw } from '@/utils/format'
import './home.css'
import './shop.css'

const emptyPagination: ProductPagination = {
  page: 1,
  limit: 7,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
}

export default function ShopCategoryPage() {
  const { category: categoryParam } = useParams<{ category: string }>()
  const category = parseProductCategory(categoryParam)
  const { sessionUser, clearSession } = useSessionUser()

  const [products, setProducts] = useState<ProductRecord[]>([])
  const [pagination, setPagination] =
    useState<ProductPagination>(emptyPagination)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const categoryLabel = useMemo(() => {
    if (!category) return null
    return (
      SHOP_CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? category
    )
  }, [category])

  const loadProducts = useCallback(
    async (targetPage: number, cat: ProductCategory) => {
      setError(null)
      setLoading(true)
      try {
        const result = await fetchProducts({ page: targetPage, category: cat })
        setProducts(result.products)
        setPagination(result.pagination)
        setPage(result.pagination.page)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '상품을 불러오지 못했습니다.'
        )
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    setPage(1)
  }, [category])

  useEffect(() => {
    if (!category) {
      setLoading(false)
      return
    }
    void loadProducts(page, category)
  }, [category, page, loadProducts])

  const goToPage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > pagination.totalPages) return
    setPage(nextPage)
  }

  if (!category) {
    return (
      <div className="shop-page">
        <HomeLandingHeader
          sessionUser={sessionUser}
          onLoggedOut={clearSession}
        />
        <div className="shop-page__body">
          <p className="shop-page__message">
            유효하지 않은 카테고리입니다.{' '}
            <Link className="shop-page__inline-link" to="/">
              메인으로
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="shop-page">
      <HomeLandingHeader sessionUser={sessionUser} onLoggedOut={clearSession} />

      <div className="shop-page__body">
        <header className="shop-page__head">
          <h1 className="shop-page__title">{categoryLabel}</h1>
        </header>

        <nav className="shop-page__filter" aria-label="Shop categories">
          {SHOP_CATEGORY_OPTIONS.map(({ value, label }) => (
            <Link
              key={value}
              className={`shop-page__filter-link${
                value === category ? ' shop-page__filter-link--active' : ''
              }`}
              to={shopCategoryPath(value)}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="shop-page__main">
          {error ? <p className="shop-page__message">{error}</p> : null}
          {loading && !error ? (
            <p className="shop-page__message shop-page__message--loading">
              불러오는 중…
            </p>
          ) : null}

          {!loading && !error && products.length === 0 ? (
            <p className="shop-page__message">등록된 상품이 없습니다.</p>
          ) : null}

          {!loading && !error && products.length > 0 ? (
            <>
              <ul className="shop-grid">
                {products.map((product) => (
                  <li key={product._id} className="shop-card">
                    <Link
                      className="shop-card__link"
                      to={shopProductPath(product._id)}
                    >
                      <div className="shop-card__media">
                        <img
                          src={product.image.url}
                          alt={product.name}
                          loading="lazy"
                        />
                        <div className="shop-card__caption">
                          <p className="shop-card__name">{product.name}</p>
                          <p className="shop-card__price">
                            {formatKrw(product.price)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>

              {pagination.totalPages > 1 ? (
                <nav className="shop-pagination" aria-label="상품 페이지">
                  <button
                    type="button"
                    className="shop-pagination__btn"
                    onClick={() => goToPage(page - 1)}
                    disabled={!pagination.hasPrev}
                  >
                    Prev
                  </button>
                  <span className="shop-pagination__status">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    className="shop-pagination__btn"
                    onClick={() => goToPage(page + 1)}
                    disabled={!pagination.hasNext}
                  >
                    Next
                  </button>
                </nav>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}