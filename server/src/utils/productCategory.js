/** DB·API 카테고리 값 */
export const PRODUCT_CATEGORIES = Object.freeze([
  'TOP',
  'BOTTOM',
  'DRESS',
  'ACCESSORY',
]);

/** 기존 한글 데이터 마이그레이션용 */
export const LEGACY_CATEGORY_TO_CODE = Object.freeze({
  상의: 'TOP',
  하의: 'BOTTOM',
  드레스: 'DRESS',
  악세사리: 'ACCESSORY',
});

/**
 * 저장·필터용 카테고리 정규화 → TOP | BOTTOM | DRESS | ACCESSORY
 */
export function resolveCategoryDbValue(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase();
  if (PRODUCT_CATEGORIES.includes(upper)) return upper;
  if (LEGACY_CATEGORY_TO_CODE[trimmed]) return LEGACY_CATEGORY_TO_CODE[trimmed];
  return null;
}