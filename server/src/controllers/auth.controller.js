import { User } from '../models/User.js';
import { isValidEmailFormat } from '../utils/email.js';
import { verifyPassword } from '../utils/password.js';
import { signAccessToken } from '../utils/jwt.js';

const LOGIN_FAIL_MESSAGE =
  '이메일 또는 비밀번호가 올바르지 않습니다.';

  // 비밀번호 제외한 유저 정보 반환
function toSafeUser(user) {
  const userSafe = user.toObject({ getters: true, virtuals: false });
  delete userSafe.password;
  return userSafe;
}

  // 로그인
export async function loginUser(req, res) {
  const { email, password } = req.body;

  // 이메일 형식 검증
  const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  // 이메일 또는 비밀번호 없음
  if (!trimmedEmail || !password) {
    return res.status(400).json({
      message: 'email and password are required',
    });
  }
  
  // 이메일 형식 검증
  if (!isValidEmailFormat(trimmedEmail)) {
    return res.status(400).json({
      message: 'Invalid email format. Use something like user@example.com',
    });
  }

  // 유저 조회
  const user = await User.findOne({ email: trimmedEmail }).select('+password');
  if (!user) {
    return res.status(401).json({ message: LOGIN_FAIL_MESSAGE });
  }

  // 비밀번호 검증
  const isMatch = await verifyPassword(String(password), user.password);
  if (!isMatch) {
    return res.status(401).json({ message: LOGIN_FAIL_MESSAGE });
  }

  try {
    // 토큰 발급
    const token = signAccessToken(user);
    // 응답
    res.status(200).json({
      message: 'Login successful',
      token,
      user: toSafeUser(user),
    });
  } catch (err) {
    console.error(err);
    const missingSecret =
      err instanceof Error && err.message.includes('JWT_SECRET');
    res.status(500).json({
      message: missingSecret
        ? 'JWT_SECRET이 설정되지 않았습니다. server/.env에 값을 넣고 서버를 재시작해 주세요.'
        : '로그인 토큰 발급에 실패했습니다.',
    });
  }
}