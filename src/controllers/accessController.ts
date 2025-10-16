import { db } from '../providers/db.js';
import { CODE_POLICY, verifyCode, hashCode } from '../utils/security.js';

export async function accessLogin(req, res) {
  const { email, code } = req.body;
  const q = await db.query(
    `SELECT ac.id, ac.code_hash, ac.expires_at, ac.active, u.id as user_id
     FROM access_codes ac JOIN users u ON u.id=ac.user_id
     WHERE u.email=$1 AND ac.active=true
     ORDER BY ac.issued_at DESC LIMIT 1`,
    [email]
  );
  if (!q.rows.length) return res.status(400).json({ error: 'No hay código activo' });
  const ac = q.rows[0];
  if (new Date(ac.expires_at) <= new Date()) return res.status(401).json({ error: 'Código expirado' });
  const ok = await verifyCode(code, ac.code_hash);
  if (!ok) return res.status(401).json({ error: 'Código inválido' });
  await db.query('UPDATE access_codes SET last_used_at=now() WHERE id=$1', [ac.id]);
  res.json({ message: 'Acceso concedido', user_id: ac.user_id });
}

export async function changeAccessCode(req, res) {
  const { email, current_code, new_code } = req.body;
  if (!CODE_POLICY.test(new_code)) {
    return res.status(400).json({ error: 'El nuevo código debe tener al menos 1 mayúscula, 1 minúscula, 1 número y 8+ caracteres' });
  }
  const q = await db.query(
    `SELECT ac.id, ac.code_hash, ac.expires_at
     FROM access_codes ac JOIN users u ON u.id=ac.user_id
     WHERE u.email=$1 AND ac.active=true
     ORDER BY ac.issued_at DESC LIMIT 1`,
    [email]
  );
  if (!q.rows.length) return res.status(404).json({ error: 'No hay código activo' });
  if (new Date(q.rows[0].expires_at) <= new Date()) return res.status(400).json({ error: 'El código está expirado' });

  const ok = await verifyCode(current_code, q.rows[0].code_hash);
  if (!ok) return res.status(401).json({ error: 'Código actual incorrecto' });

  const newHash = await hashCode(new_code);
  await db.query(`UPDATE access_codes SET code_hash=$1, code_hint=$2 WHERE id=$3`, [newHash, new_code.slice(-4), q.rows[0].id]);
  res.json({ message: 'Código actualizado' });
}
