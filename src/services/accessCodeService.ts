// src/services/accessCodeService.ts
import { db } from '../providers/db.js';
import { generateReadableCode, hashCode } from '../utils/security.js';
import { sendEmail } from '../providers/mailer.js';
import { sendWhatsAppTemplate } from '../providers/whatsapp.js';

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

  const u = await db.query('SELECT email, whatsapp FROM users WHERE id=$1', [userId]);
  const { email, whatsapp } = u.rows[0];
  await sendEmail(email, 'Tu código de acceso', `<p>Código: ${plain} (vigente hasta ${expires.toISOString()})</p>`);
  await sendWhatsAppTemplate(whatsapp, 'access_code', [plain]);
}

