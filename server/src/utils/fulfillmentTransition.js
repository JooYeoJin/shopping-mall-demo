import { ORDER_STATUS } from '../models/Order.js';

export const FULFILLMENT_STEPS = [
  ORDER_STATUS.PAID,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.SHIPPING,
  ORDER_STATUS.DELIVERED,
];

function invoiceComplete(shipping) {
  return Boolean(
    typeof shipping?.carrier === 'string' &&
      shipping.carrier.trim() &&
      typeof shipping?.tracking_number === 'string' &&
      shipping.tracking_number.trim()
  );
}

export function fulfillmentRank(status) {
  return FULFILLMENT_STEPS.indexOf(status);
}

/**
 * 전진: 출고대기 → 상품준비중 → 배송중(송장 필수) → 배송완료 (한 칸씩).
 * 되돌리기: 이전 단계 중 어디로든 (rollback 플래그 필요).
 */
export function getFulfillmentTransitionError(
  currentStatus,
  nextStatus,
  shipping,
  { rollback = false } = {}
) {
  if (!nextStatus || nextStatus === currentStatus) return null;

  if (
    nextStatus === ORDER_STATUS.CANCELLED ||
    nextStatus === ORDER_STATUS.REFUNDED
  ) {
    return null;
  }

  const from = fulfillmentRank(currentStatus);
  const to = fulfillmentRank(nextStatus);
  if (from < 0 || to < 0) return null;

  if (to === from + 1) {
    if (
      nextStatus === ORDER_STATUS.SHIPPING &&
      currentStatus === ORDER_STATUS.PREPARING &&
      !invoiceComplete(shipping)
    ) {
      return '배송중으로 바꾸려면 택배사와 송장번호가 필요합니다.';
    }
    return null;
  }

  if (to > from + 1) {
    return '단계를 건너뛸 수 없습니다. 바로 다음 단계로만 진행할 수 있습니다.';
  }

  if (to < from) {
    if (nextStatus === ORDER_STATUS.PAID) return null;
    if (!rollback) {
      return '이전 단계로 되돌리려면 배송 상세에서 단계 되돌리기를 사용해 주세요.';
    }
    return null;
  }

  return null;
}
