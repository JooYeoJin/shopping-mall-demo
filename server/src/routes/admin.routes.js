import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getAdminDashboardStats } from '../controllers/admin.controller.js';
import {
  createProduct,
  getNextProductId,
} from '../controllers/product.controller.js';
import {
  deleteOrder,
  getOrder,
  listOrders,
  updateOrder,
} from '../controllers/order.controller.js';

const router = Router();

router.get('/stats', asyncHandler(getAdminDashboardStats));

// 관리자 상품 등록 (AdminProductsPage)
router.get('/products/next-id', asyncHandler(getNextProductId));
router.post('/products', asyncHandler(createProduct));

router.get('/orders', asyncHandler(listOrders));
router.get('/orders/:id', asyncHandler(getOrder));
router.patch('/orders/:id', asyncHandler(updateOrder));
router.delete('/orders/:id', asyncHandler(deleteOrder));

export default router;