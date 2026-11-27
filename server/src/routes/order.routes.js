import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  cancelMyOrder,
  confirmMyOrder,
  createMyOrder,
  getMyOrder,
  listMyOrders,
  prepareMyCheckout,
  validatePaymentBeforeOrder,
} from '../controllers/order.controller.js';

const router = Router();

router.use(requireAuth);

/** 내 주문 목록 */
router.get('/me', asyncHandler(listMyOrders));

/** 결제 중복·검증 (주문 생성 전) */
router.post('/me/payment/validate', asyncHandler(validatePaymentBeforeOrder));

/** 결제창 전 체크아웃 임시 저장 (주문 문서는 결제 완료 후 생성) */
router.post('/me/prepare', asyncHandler(prepareMyCheckout));

/** 장바구니 → 주문 (레거시·mock) */
router.post('/me', asyncHandler(createMyOrder));

/** PG 승인 후 주문 확정 */
router.post('/me/:id/confirm', asyncHandler(confirmMyOrder));

/** 내 주문 상세 */
router.get('/me/:id', asyncHandler(getMyOrder));

/** 내 주문 취소 */
router.patch('/me/:id/cancel', asyncHandler(cancelMyOrder));

export default router;