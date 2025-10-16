import { db } from '../providers/db.js';

export async function verifyEmail(req, res) {
  const { token } = req.body;
  const { rows } = await db.query(
    `SELECT v.*, u.id as user_id FROM verifications v
     JOIN users u ON u.id=v.user_id
     WHERE v.type='email' AND v.token_or_code=$1 AND v.verified_at IS NULL AND v.expires_at>now()`,
    [token]
  );
  if (!rows.length) return res.status(400).json({ error: 'Token inválido o expirado' });
  await db.query('UPDATE verifications SET verified_at=now() WHERE id=$1', [rows[0].id]);
  await db.query('UPDATE users SET email_verified_at=now(), updated_at=now() WHERE id=$1', [rows[0].user_id]);
  res.json({ message: 'Correo verificado' });
}

export async function verifyWhatsApp(req, res) {
  const { email, code } = req.body;
  const u = await db.query('SELECT id FROM users WHERE email=$1', [email]);
  if (!u.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
  const v = await db.query(
    `SELECT * FROM verifications
     WHERE user_id=$1 AND type='whatsapp' AND token_or_code=$2 AND verified_at IS NULL AND expires_at>now()`,
    [u.rows[0].id, code]
  );
  if (!v.rows.length) return res.status(400).json({ error: 'Código inválido o expirado' });
  await db.query('UPDATE verifications SET verified_at=now() WHERE id=$1', [v.rows[0].id]);
  await db.query('UPDATE users SET whatsapp_verified_at=now(), updated_at=now() WHERE id=$1', [u.rows[0].id]);
  res.json({ message: 'WhatsApp verificado' });
}
