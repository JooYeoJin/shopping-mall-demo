import { useCallback, useRef, useState, type FormEvent } from 'react'
import { CloudinaryImageField } from '@/components/admin/CloudinaryImageField'
import {
  PRODUCT_CATEGORIES,
  getProductCategoryLabel,
  type ProductCategory,
} from '@/types/product'
import { createProduct, fetchNextProductId } from '@/services/productService'
import {
  parseWonPriceInput,
  preventNumberInputWheel,
} from '@/utils/priceInput'

const initialForm = {
  product_id: '',
  imagePublicId: '',
  imageUrl: '',
  name: '',
  price: '',
  category: '' as '' | ProductCategory,
  description: '',
}

type Props = {
  onCreated?: () => void
  onCancel?: () => void
}

export function ProductCreateForm({ onCreated, onCancel }: Props) {
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [idLoading, setIdLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const categoryRequest = useRef(0)

  const setField = useCallback(
    <K extends keyof typeof initialForm>(key: K, value: (typeof initialForm)[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const handleCategoryChange = async (value: '' | ProductCategory) => {
    const requestId = ++categoryRequest.current
    setError(null)
    setForm((prev) => ({ ...prev, category: value, product_id: '' }))
    if (!value) return

    setIdLoading(true)
    try {
      const product_id = await fetchNextProductId(value)
      if (categoryRequest.current !== requestId) return
      setForm((prev) =>
        prev.category === value ? { ...prev, product_id } : prev
      )
    } catch (err) {
      if (categoryRequest.current !== requestId) return
      setError(
        err instanceof Error
          ? err.message
          : '상품 코드를 만들지 못했습니다. 카테고리를 다시 선택해 주세요.'
      )
    } finally {
      if (categoryRequest.current === requestId) setIdLoading(false)
    }
  }

  const validate = (): string | null => {
    if (!form.category) return '카테고리를 선택해 주세요.'
    if (!form.product_id.trim() || idLoading)
      return '카테고리를 선택하면 상품 코드가 자동으로 만들어집니다.'
    if (!form.imagePublicId.trim() || !form.imageUrl.trim())
      return 'Cloudinary에서 대표 이미지를 업로드해 주세요.'
    if (!form.name.trim()) return '상품명을 입력해 주세요.'
    if (!form.price.trim()) return '가격을 입력해 주세요.'
    const price = parseWonPriceInput(form.price)
    if (price === null) {
      return '가격은 0 이상의 숫자(원)여야 합니다.'
    }
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    const price = parseWonPriceInput(form.price)!
    const description = form.description.trim() ? form.description.trim() : null

    setLoading(true)
    try {
      await createProduct({
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
      setSuccess('상품이 등록되었습니다.')
      setForm(initialForm)
      onCreated?.()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '상품 등록에 실패했습니다.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit} noValidate>
      <h2 className="admin-form__title">상품 등록</h2>

      <div className="admin-form__grid">
        <label className="admin-field">
          <span className="admin-field__label">상품 ID *</span>
          <input
            value={form.product_id}
            readOnly
            placeholder={
              idLoading
                ? '코드 생성 중…'
                : '카테고리를 선택하면 자동 생성됩니다'
            }
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
              void handleCategoryChange(
                e.target.value as typeof form.category
              )
            }
            disabled={loading || idLoading}
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

      <div className="admin-form__actions">
        <button
          type="submit"
          className="admin-btn admin-btn--primary"
          disabled={loading}
        >
          {loading ? '등록 중…' : '등록하기'}
        </button>
        {onCancel ? (
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={onCancel}
            disabled={loading}
          >
            닫기
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="admin-message" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="admin-message admin-message--success" role="status">
          {success}
        </p>
      ) : null}
    </form>
  )
}