export const PRODUCT_CATEGORIES = [
  'TOP',
  'BOTTOM',
  'DRESS',
  'ACCESSORY',
] as const

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]

/** UI 표시용 영문 라벨 */
export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  TOP: 'Top',
  BOTTOM: 'Bottom',
  DRESS: 'Dress',
  ACCESSORY: 'Accessory',
}

export function toApiCategory(category: string): ProductCategory | null {
  const upper = category.trim().toUpperCase()
  return (PRODUCT_CATEGORIES as readonly string[]).includes(upper)
    ? (upper as ProductCategory)
    : null
}

export function getProductCategoryLabel(category: string): string {
  const api = toApiCategory(category)
  if (api) return PRODUCT_CATEGORY_LABELS[api]
  return category
}

export const SHOP_CATEGORY_OPTIONS: ReadonlyArray<{
  value: ProductCategory
  label: string
}> = PRODUCT_CATEGORIES.map((value) => ({
  value,
  label: PRODUCT_CATEGORY_LABELS[value],
}))

export function parseProductCategory(
  raw: string | undefined
): ProductCategory | null {
  if (!raw) return null
  const decoded = decodeURIComponent(raw).trim().toUpperCase()
  return (PRODUCT_CATEGORIES as readonly string[]).includes(decoded)
    ? (decoded as ProductCategory)
    : null
}

export function shopCategoryPath(category: ProductCategory): string {
  return `/shop/${encodeURIComponent(category)}`
}

export function shopProductPath(productId: string): string {
  return `/product/${encodeURIComponent(productId)}`
}

export type ProductImage = {
  public_id: string
  url: string
}

export type CreateProductPayload = {
  product_id: string
  image: ProductImage
  name: string
  price: number
  category: ProductCategory
  description?: string | null
}

export type UpdateProductPayload = Partial<CreateProductPayload>

export type ProductRecord = CreateProductPayload & {
  _id: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export const PRODUCT_LIST_PAGE_SIZE = 7

export type ProductPagination = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export type ProductListParams = {
  page?: number
  limit?: number
  name?: string
  category?: ProductCategory
}

export type ProductListResult = {
  products: ProductRecord[]
  pagination: ProductPagination
}