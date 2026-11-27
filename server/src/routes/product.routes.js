import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/product.controller.js';

const router = Router();

// 상품 전체 조회
router.get('/', asyncHandler(listProducts));
// 상품 단일 조회
router.get('/:id', asyncHandler(getProductById));
// 상품 생성
router.post('/', asyncHandler(createProduct));
router.patch('/:id', asyncHandler(updateProduct));
router.delete('/:id', asyncHandler(deleteProduct));

export default router;