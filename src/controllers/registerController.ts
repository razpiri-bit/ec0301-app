import { db } from '../providers/db.js';
import { sendEmail } from '../providers/mailer.js';
import { sendWhatsAppTemplate } from '../providers/whatsapp.js';
import crypto from 'crypto';

export async function startRegistration(req, res) {
  const { name, email, whatsapp, acceptPrivacy } = req.body;
  if (!acceptPrivacy) return res.status(400).json({ error: 'Debe aceptar el aviso de privacidad' });
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO users (name,email,whatsapp,privacy_consent_at)
       VALUES ($1,$2,$3, now())
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, whatsapp=EXCLUDED.whatsapp, updated_at=now()
       RETURNING *`,
      [name, email, whatsapp]
    );
    const user = rows[0];
    const emailToken = crypto.randomBytes(16).toString('hex');
    await client.query(
      `INSERT INTO verifications (user_id,type,token_or_code,expires_at)
       VALUES ($1,'email',$2, now() + interval '24 hours')`,
      [user.id, emailToken]
    );
    await sendEmail(email, 'Verifica tu correo', `<p>${process.env.APP_BASE_URL}/verify-email?token=${emailToken}</p>`);
    const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
    await client.query(
      `INSERT INTO verifications (user_id,type,token_or_code,expires_at)
       VALUES ($1,'whatsapp',$2, now() + interval '10 minutes')`,
      [user.id, otp]
    );
    await sendWhatsAppTemplate(whatsapp, 'auth_otp', [otp, '10']);
    await client.query('COMMIT');
    res.json({ message: 'Registro iniciado: verifique correo y WhatsApp.' });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error en registro' });
  } finally {
    client.release();
  }
}
