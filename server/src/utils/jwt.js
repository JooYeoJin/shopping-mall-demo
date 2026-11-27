import jwt from 'jsonwebtoken';

const DEFAULT_EXPIRES_IN = '7d';

  // JWT_SECRET 가져오기
export function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    // JWT_SECRET 없음
    throw new Error(
      'JWT_SECRET is not set. Add it to server/.env (see .env.example).'
    );
  }
  // JWT_SECRET 반환
  return secret;
}

  // 액세스 토큰 발급
export function signAccessToken(user) {
  const payload = {
    sub: String(user._id),
    email: user.email,
    user_type: user.user_type,
  };

  // JWT_SECRET 및 만료 시간 설정
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN?.trim() || DEFAULT_EXPIRES_IN,
  });
}