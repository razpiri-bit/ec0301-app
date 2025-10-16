import { db } from '../providers/db.js';

export async function createCheckout(req, res) {
  const { email, method, amount, currency = 'MXN' } = req.body;
  const { rows } = await db.query('SELECT * FROM users WHERE email=$1', [email]);
  if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
  const user = rows[0];
  if (!user.email_verified_at || !user.whatsapp_verified_at) {
    return res.status(400).json({ error: 'Verifique correo y WhatsApp antes de pagar' });
  }
  const { rows: p } = await db.query(
    `INSERT INTO payments (user_id, method, status, amount, currency)
     VALUES ($1,$2,'pending',$3,$4) RETURNING id`,
    [user.id, method, amount, currency]
  );
  res.json({ payment_id: p[0].id, status: 'pending' });
}
