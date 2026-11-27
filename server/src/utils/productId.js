import { Product } from '../models/Product.js';
import { PRODUCT_CATEGORIES } from './productCategory.js';

/** 상품 코드에 쓰는 카테고리 약어 */
export const PRODUCT_ID_CODES = Object.freeze({
  TOP: 'TOP',
  BOTTOM: 'BOTTOM',
  DRESS: 'DRESS',
  ACCESSORY: 'ACC',
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function productIdPrefix(category) {
  const code = PRODUCT_ID_CODES[category];
  if (!code) return null;
  return `WB-${code}-`;
}

export function formatProductId(category, serial) {
  const prefix = productIdPrefix(category);
  if (!prefix) return null;
  return `${prefix}${String(serial).padStart(3, '0')}`;
}

/** 해당 카테고리에서 가장 큰 일련번호 + 1 */
export async function nextProductIdForCategory(category) {
  if (!PRODUCT_CATEGORIES.includes(category)) return null;
  const prefix = productIdPrefix(category);
  const rows = await Product.find(
    { product_id: { $regex: `^${escapeRegex(prefix)}\\d+$` } },
    { product_id: 1 }
  ).lean();

  let max = 0;
  for (const row of rows) {
    const n = Number.parseInt(String(row.product_id).slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }

  return formatProductId(category, max + 1);
}
