import { db } from '../providers/db.js';
import { generateReadableCode, hashCode } from '../utils/security.js';

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function issueInitialAccessCode(userId: string) {
  const plain = generateReadableCode(8);
  const hash = await hashCode(plain);
  const expires = addMonths(new Date(), 3);
  await db.query(
    `INSERT INTO access_codes (user_id, code_hash, code_hint, active, issued_at, expires_at)
     VALUES ($1,$2,$3,true, now(), $4)`,
    [userId, hash, plain.slice(-4), expires]
  );
  // Enviar por correo/WhatsApp con tus providers reales
}
