import { db } from '../providers/db.js';
import { issueInitialAccessCode } from '../services/accessCodeService.js';

export async function approvePayment(req, res) {
  const paymentId = req.params.id;
  const reviewerId = 'admin'; // reemplazar con auth real
  const notes = req.body?.notes || null;

  const { rows } = await db.query(
    `UPDATE payments
       SET review_status='approved', reviewer_id=$2, review_notes=$3, reviewed_at=now(), status='paid'
     WHERE id=$1 AND status='captured' AND review_status='pending'
     RETURNING user_id`,
    [paymentId, reviewerId, notes]
  );
  if (!rows.length) return res.status(400).json({ error: 'Pago no apto para aprobación' });
  await issueInitialAccessCode(rows[0].user_id);
  res.json({ message: 'Pago aprobado y código emitido' });
}
