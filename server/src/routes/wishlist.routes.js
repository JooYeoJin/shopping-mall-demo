import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  getMyWishlist,
  removeWishlistItem,
  toggleWishlistItem,
} from '../controllers/wishlist.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/me', asyncHandler(getMyWishlist));
router.post('/me/items', asyncHandler(toggleWishlistItem));
router.delete('/me/items/:productId', asyncHandler(removeWishlistItem));

export default router;
