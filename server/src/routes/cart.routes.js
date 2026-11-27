import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  addCartItem,
  clearMyCart,
  deleteMyCart,
  getMyCart,
  removeCartItem,
  updateCartItem,
} from '../controllers/cart.controller.js';

const router = Router();

router.use(requireAuth);

// 내 장바구니 조회
router.get('/me', asyncHandler(getMyCart));

// 장바구니 문서 삭제
router.delete('/me', asyncHandler(deleteMyCart));

// 품목 전체 비우기
router.delete('/me/items', asyncHandler(clearMyCart));

// 품목 추가
router.post('/me/items', asyncHandler(addCartItem));

// 품목 수량 수정
router.patch('/me/items/:itemId', asyncHandler(updateCartItem));

// 품목 삭제
router.delete('/me/items/:itemId', asyncHandler(removeCartItem));

export default router;