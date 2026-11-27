import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react'
import { CloudinaryImageField } from '@/components/admin/CloudinaryImageField'
import {
  deleteProduct,
  updateProduct,
} from '@/services/productService'
import {
  PRODUCT_CATEGORIES,
  getProductCategoryLabel,
  toApiCategory,
  type ProductCategory,
  type ProductRecord,
} from '@/types/product'
import { formatKrw } from '@/utils/format'
import {
  formatWonInputValue,
  parseWonPriceInput,
  preventNumberInputWheel,
} from '@/utils/priceInput'

type FormState = {
  product_id: string
  imagePublicId: string
  imageUrl: string
  name: string
  price: string
  category: '' | ProductCategory
  description: string
}

function toFormState(product: ProductRecord): FormState {
  return {
    product_id: product.product_id,
    imagePublicId: product.image.public_id,
    imageUrl: product.image.url,
    name: product.name,
    price: formatWonInputValue(product.price),
    category: toApiCategory(product.category) ?? '',
    description: product.description ?? '',
  }
}

type Props = {
  product: ProductRecord
  onClose: () => void
  onUpdated: (product: ProductRecord) => void
  onDeleted: () => void
}

export function ProductDetailModal({
  product: initialProduct,
  onClose,
  onUpdated,
  onDeleted,
}: Props) {
  const [product, setProduct] = useState(initialProduct)
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [form, setForm] = useState<FormState>(() => toFormState(initialProduct))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    setProduct(initialProduct)
    setForm(toFormState(initialProduct))
    setMode('view')
    setError(null)
    setNotice(null)
  }, [initialProduct._id, initialProduct.updatedAt])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [loading, onClose])

  const setField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const validate = (): string | null => {
    if (!form.product_id.trim()) return '상품 ID를 입력해 주세요.'
    if (!form.imagePublicId.trim() || !form.imageUrl.trim())
      return '대표 이미지를 업로드해 주세요.'
    if (!form.name.trim()) return '상품명을 입력해 주세요.'
    if (!form.price.trim()) return '가격을 입력해 주세요.'
    const price = parseWonPriceInput(form.price)
    if (price === null) {
      return '가격은 0 이상의 숫자(원)여야 합니다.'
    }
    if (!form.category) return '카테고리를 선택해 주세요.'
    return null
  }

  const startEdit = () => {
    setForm(toFormState(product))
    setError(null)
    setNotice(null)
    setMode('edit')
  }

  const cancelEdit = () => {
    setForm(toFormState(product))
    setError(null)
    setMode('view')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    const price = parseWonPriceInput(form.price)
    if (price === null) {
      setError('가격은 0 이상의 숫자(원)여야 합니다.')
      return
    }
    const description = form.description.trim() ? form.description.trim() : null

    setLoading(true)
    try {
      const updated = await updateProduct(product._id, {
        product_id: form.product_id.trim(),
        image: {
          public_id: form.imagePublicId.trim(),
          url: form.imageUrl.trim(),
        },
        name: form.name.trim(),
        price,
        category: form.category as ProductCategory,
        description,
      })
      setProduct(updated)
      setForm(toFormState(updated))
      setMode('view')
      setNotice('상품 정보가 수정되었습니다.')
      onUpdated(updated)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '상품 수정에 실패했습니다.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    const ok = window.confirm(
      `「${product.name}」 상품을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`
    )
    if (!ok) return

    setError(null)
    setNotice(null)
    setLoading(true)
    try {
      await deleteProduct(product._id)
      onDeleted()
      onClose()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '상품 삭제에 실패했습니다.'
      )
    } finally {
      setLoading(false)
    }
  }

  const stopBackdrop = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) onClose()
  }

  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onClick={stopBackdrop}
    >
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-product-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal__head">
          <h2 id="admin-product-detail-title" className="admin-modal__title">
            {mode === 'view' ? '상품 상세' : '상품 수정'}
          </h2>
          <button
            type="button"
            className="admin-modal__close"
            onClick={onClose}
            disabled={loading}
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        {mode === 'view' ? (
          <div className="admin-product-detail">
            <div className="admin-product-detail__image admin-form__preview admin-form__preview--product admin-form__preview--has-image">
              <img src={product.image.url} alt={product.name} />
            </div>

            <dl className="admin-product-detail__meta">
              <div>
                <dt>상품 ID</dt>
                <dd>{product.product_id}</dd>
              </div>
              <div>
                <dt>상품명</dt>
                <dd>{product.name}</dd>
              </div>
              <div>
                <dt>가격</dt>
                <dd>{formatKrw(product.price)}</dd>
              </div>
              <div>
                <dt>카테고리</dt>
                <dd>{getProductCategoryLabel(product.category)}</dd>
              </div>
              <div className="admin-product-detail__meta-row--full">
                <dt>상품 설명</dt>
                <dd>
                  {product.description?.trim() ? product.description : '—'}
                </dd>
              </div>
              <div className="admin-product-detail__meta-row--full">
                <dt>Cloudinary public_id</dt>
                <dd className="admin-product-detail__mono">
                  {product.image.public_id}
                </dd>
              </div>
            </dl>

            <div className="admin-modal__actions">
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={startEdit}
                disabled={loading}
              >
                수정
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--danger"
                onClick={() => void handleDelete()}
                disabled={loading}
              >
                {loading ? '처리 중…' : '삭제'}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={onClose}
                disabled={loading}
              >
                닫기
              </button>
            </div>
          </div>
        ) : (
          <form className="admin-form admin-form--modal" onSubmit={handleSubmit} noValidate>
            <div className="admin-form__grid">
              <label className="admin-field">
                <span className="admin-field__label">상품 ID *</span>
                <input
                  value={form.product_id}
                  onChange={(e) => setField('product_id', e.target.value)}
                  disabled={loading}
                />
              </label>

              <label className="admin-field">
                <span className="admin-field__label">상품명 *</span>
                <input
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  disabled={loading}
                />
              </label>

              <label className="admin-field">
                <span className="admin-field__label">가격 (원) *</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={form.price}
                  onChange={(e) => setField('price', e.target.value)}
                  onWheel={preventNumberInputWheel}
                  placeholder="예: 59000"
                  disabled={loading}
                />
              </label>

              <label className="admin-field">
                <span className="admin-field__label">카테고리 *</span>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setField('category', e.target.value as FormState['category'])
                  }
                  disabled={loading}
                >
                  <option value="">선택</option>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {getProductCategoryLabel(cat)}
                    </option>
                  ))}
                </select>
              </label>

              <CloudinaryImageField
                publicId={form.imagePublicId}
                imageUrl={form.imageUrl}
                disabled={loading}
                onChange={({ publicId, url }) => {
                  setField('imagePublicId', publicId)
                  setField('imageUrl', url)
                }}
                onClear={() => {
                  setField('imagePublicId', '')
                  setField('imageUrl', '')
                }}
              />

              <label className="admin-field admin-field--full">
                <span className="admin-field__label">상품 설명</span>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="(선택)"
                  disabled={loading}
                />
              </label>
            </div>

            <div className="admin-modal__actions">
              <button
                type="submit"
                className="admin-btn admin-btn--primary"
                disabled={loading}
              >
                {loading ? '저장 중…' : '저장'}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={cancelEdit}
                disabled={loading}
              >
                취소
              </button>
            </div>
          </form>
        )}

        {error ? (
          <p className="admin-message" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="admin-message admin-message--success" role="status">
            {notice}
          </p>
        ) : null}
      </div>
    </div>
  )
}