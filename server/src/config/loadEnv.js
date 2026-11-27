import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn(
    `[env] server/.env를 불러오지 못했습니다 (${envPath}): ${result.error.message}`
  );
} else if (!process.env.JWT_SECRET?.trim()) {
  console.warn(
    '[env] JWT_SECRET이 비어 있습니다. 로그인 시 토큰 발급이 실패합니다. server/.env를 확인하세요.'
  );
}