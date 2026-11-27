import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminPageHead } from '@/components/admin/AdminPageHead'
import { ProductCreateForm } from '@/components/admin/ProductCreateForm'
import { ProductDetailModal } from '@/components/admin/ProductDetailModal'
import { fetchProducts } from '@/services/productService'
import {
  getProductCategoryLabel,
  type ProductPagination,
  type ProductRecord,
} from '@/types/product'
import { formatKrw } from '@/utils/format'

const emptyPagination: ProductPagination = {
  page: 1,
  limit: 7,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [pagination, setPagination] =
    useState<ProductPagination>(emptyPagination)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createNotice, setCreateNotice] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(
    null
  )
  const [nameQuery, setNameQuery] = useState('')
  const [appliedName, setAppliedName] = useState('')

  const listSubtitle = useMemo(() => {
    if (loading) return '등록 상품 …'
    const query = appliedName.trim()
    if (query) {
      return `검색 결과 ${pagination.total}개 (페이지 ${pagination.page}/${Math.max(pagination.totalPages, 1)})`
    }
    return `등록 상품 ${pagination.total}개 (페이지 ${pagination.page}/${Math.max(pagination.totalPages, 1)})`
  }, [loading, appliedName, pagination])

  const loadProducts = useCallback(
    async (targetPage: number, name: string) => {
      setError(null)
      setLoading(true)
      try {
        const result = await fetchProducts({
          page: targetPage,
          name: name.trim() || undefined,
        })
        setProducts(result.products)
        setPagination(result.pagination)
        setPage(result.pagination.page)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : '상품 목록을 불러오지 못했습니다.'
        )
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedName(nameQuery)
      setPage(1)
    }, 400)
    return () => window.clearTimeout(timer)
  }, [nameQuery])

  useEffect(() => {
    void loadProducts(page, appliedName)
  }, [page, appliedName, loadProducts])

  const handleCreated = () => {
    setCreateNotice('상품이 등록되었습니다.')
    setShowCreateForm(false)
    setPage(1)
    void loadProducts(1, appliedName)
  }

  const goToPage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > pagination.totalPages) return
    setPage(nextPage)
  }

  const reloadCurrentPage = useCallback(() => {
    void loadProducts(page, appliedName)
  }, [page, appliedName, loadProducts])

  const tableEmptyMessage = appliedName.trim()
    ? `「${appliedName.trim()}」에 맞는 상품이 없습니다.`
    : '등록된 상품이 없습니다.'

  return (
    <>
      <div className="admin-page-head admin-page-head--row">
        <AdminPageHead title="상품 관리" subtitle={listSubtitle} />
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          onClick={() => {
            setCreateNotice(null)
            setShowCreateForm((v) => !v)
          }}
        >
          {showCreateForm ? '목록만 보기' : '상품 등록하기'}
        </button>
      </div>

      <div className="admin-toolbar admin-toolbar--products">
        <label className="admin-search">
          <span className="admin-search__label">상품명 검색</span>
          <div className="admin-search__field">
            <input
              type="search"
              className="admin-search__input"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="상품명 입력"
              autoComplete="off"
              enterKeyHint="search"
            />
            {nameQuery.trim() ? (
              <button
                type="button"
                className="admin-search__clear"
                onClick={() => setNameQuery('')}
                aria-label="검색어 지우기"
              >
                지우기
              </button>
            ) : null}
          </div>
        </label>
      </div>

      {showCreateForm ? (
        <section className="admin-panel admin-panel--form">
          <ProductCreateForm
            onCreated={handleCreated}
            onCancel={() => setShowCreateForm(false)}
          />
        </section>
      ) : null}

      {createNotice ? (
        <p className="admin-message admin-message--success" role="status">
          {createNotice}
        </p>
      ) : null}

      {error ? <p className="admin-message">{error}</p> : null}
      {loading && products.length === 0 && !error ? (
        <p className="admin-message admin-message--loading">불러오는 중…</p>
      ) : null}

      {!error && (products.length > 0 || !loading) ? (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">상품 ID</th>
                  <th scope="col">이미지</th>
                  <th scope="col">이름</th>
                  <th scope="col">가격</th>
                  <th scope="col">카테고리</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={5}>{tableEmptyMessage}</td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product._id}>
                      <td>{product.product_id}</td>
                      <td>
                        <img
                          className="admin-table__thumb"
                          src={product.image.url}
                          alt=""
                          width={48}
                          height={48}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-table__name-btn"
                          onClick={() => setSelectedProduct(product)}
                        >
                          {product.name}
                        </button>
                      </td>
                      <td>{formatKrw(product.price)}</td>
                      <td>{getProductCategoryLabel(product.category)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 ? (
            <nav
              className="admin-pagination"
              aria-label="상품 목록 페이지"
            >
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => goToPage(page - 1)}
                disabled={!pagination.hasPrev}
              >
                이전
              </button>
              <span className="admin-pagination__status">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => goToPage(page + 1)}
                disabled={!pagination.hasNext}
              >
                다음
              </button>
            </nav>
          ) : null}
        </>
      ) : null}

      {selectedProduct ? (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onUpdated={(updated) => {
            setSelectedProduct(updated)
            setCreateNotice('상품 정보가 수정되었습니다.')
            reloadCurrentPage()
          }}
          onDeleted={() => {
            setSelectedProduct(null)
            setCreateNotice('상품이 삭제되었습니다.')
            const nextPage =
              products.length === 1 && page > 1 ? page - 1 : page
            setPage(nextPage)
            void loadProducts(nextPage, appliedName)
          }}
        />
      ) : null}
    </>
  )
}