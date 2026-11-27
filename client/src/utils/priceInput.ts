import type { WheelEvent } from 'react'

/** 원화 가격 입력 문자열 → 정수(원). 쉼표·공백 허용 */
export function parseWonPriceInput(raw: string): number | null {
  const normalized = raw.trim().replace(/,/g, '').replace(/\s/g, '')
  if (!normalized) return null
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null
  const num = Number(normalized)
  if (!Number.isFinite(num) || num < 0) return null
  const rounded = Math.round(num)
  if (!Number.isSafeInteger(rounded)) return null
  return rounded
}

export function formatWonInputValue(price: number): string {
  if (!Number.isFinite(price)) return ''
  return String(Math.round(price))
}

/** number input 스크롤 시 값이 바뀌는 것 방지 */
export function preventNumberInputWheel(
  e: WheelEvent<HTMLInputElement>
): void {
  e.currentTarget.blur()
}