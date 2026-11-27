import { randomBytes } from 'node:crypto';

/** 사람이 읽기 쉬운 주문 번호 */
export function generateOrderId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = randomBytes(3).toString('hex').toUpperCase();
  return `WB-${ts}-${rnd}`;
}