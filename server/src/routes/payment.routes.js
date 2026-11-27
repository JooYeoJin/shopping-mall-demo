import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { handlePortOneWebhook } from '../controllers/portoneWebhook.controller.js';

const router = Router();

/** 포트원 결제 결과 통지 (인증 없음 — 콘솔 Notification URL) */
router.post('/portone/webhook', asyncHandler(handlePortOneWebhook));

export default router;
