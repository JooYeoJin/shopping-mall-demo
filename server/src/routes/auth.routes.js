import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { loginUser } from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', asyncHandler(loginUser));

export default router;