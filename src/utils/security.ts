import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export function generateReadableCode(len = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[crypto.randomInt(0, chars.length)];
  return s;
}

export const CODE_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;

export async function hashCode(plain: string) {
  return bcrypt.hash(plain, 12);
}
export async function verifyCode(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
