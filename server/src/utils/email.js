const EMAIL_FORMAT_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailFormat(email) {
  return typeof email === 'string' && EMAIL_FORMAT_PATTERN.test(email.trim());
}