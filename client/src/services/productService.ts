import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api'
import {
  PRODUCT_LIST_PAGE_SIZE,
  type CreateProductPayload,
  type ProductCategory,
  type ProductListParams,
  type ProductListResult,
  type ProductRecord,
  type UpdateProductPayload,
} from '@/types/product'

type ProductResponse = { product: ProductRecord }

// 상품 목록 조회
function buildProductsQuery(params?: ProductListParams): string {
  const search = new URLSearchParams()
  const page = params?.page ?? 1
  const limit = params?.limit ?? PRODUCT_LIST_PAGE_SIZE
  search.set('page', String(page))
  search.set('limit', String(limit))
  const name = params?.name?.trim()
  if (name) search.set('name', name)
  if (params?.category) search.set('category', params.category)
  return `?${search.toString()}`
}
// 상품 생성
export async function fetchProducts(
  params?: ProductListParams
): Promise<ProductListResult> {
  return apiGet<ProductListResult>(`/api/products${buildProductsQuery(params)}`)
}

export async function fetchNextProductId(
  category: ProductCategory
): Promise<string> {
  const data = await apiGet<{ product_id: string }>(
    `/api/admin/products/next-id?category=${encodeURIComponent(category)}`
  )
  return data.product_id
}

// 상품 생성
export async function createProduct(
  payload: CreateProductPayload
): Promise<ProductRecord> {
  const { product } = await apiPost<ProductResponse>(
    '/api/admin/products',
    payload
  )
  return product
}

// 상품 상세 조회
export async function fetchProductById(id: string): Promise<ProductRecord> {
  const { product } = await apiGet<ProductResponse>(`/api/products/${id}`)
  return product
}

 // 상품 수정
export async function updateProduct(
  id: string,
  payload: UpdateProductPayload
): Promise<ProductRecord> {
  const { product } = await apiPatch<ProductResponse>(
    `/api/products/${id}`,
    payload
  )
  return product
}

export async function deleteProduct(id: string): Promise<void> {
  await apiDelete(`/api/products/${id}`)
}