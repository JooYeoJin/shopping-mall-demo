import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;

export function isBcryptHash(value) {
  return typeof value === 'string' && BCRYPT_HASH_PATTERN.test(value);
}

export async function hashPassword(plainPassword) {
  if (typeof plainPassword !== 'string' || !plainPassword) {
    throw new Error('Password must be a non-empty string');
  }
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function ensureHashedPassword(password) {
  if (isBcryptHash(password)) return password;
  return hashPassword(password);
}

export async function verifyPassword(plainPassword, storedPassword) {
  if (typeof plainPassword !== 'string' || !plainPassword) return false;
  if (typeof storedPassword !== 'string' || !storedPassword) return false;

  if (isBcryptHash(storedPassword)) {
    return bcrypt.compare(plainPassword, storedPassword);
  }

  return plainPassword === storedPassword;
}