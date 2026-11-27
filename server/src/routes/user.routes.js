import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser,
} from '../controllers/user.controller.js';

const router = Router();

// 유저 전체 조회
router.get('/', asyncHandler(listUsers));

// 유저 단일 조회
router.get('/:id', asyncHandler(getUserById));

// 유저 생성
router.post('/', asyncHandler(createUser));

// 비밀번호 초기화
router.post('/:id/reset-password', asyncHandler(resetUserPassword));

// 유저 수정
router.patch('/:id', asyncHandler(updateUser));

// 유저 삭제
router.delete('/:id', asyncHandler(deleteUser));

export default router;