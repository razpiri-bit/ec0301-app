import { Router } from 'express';
import { db } from '../providers/db.js';
const r = Router();

r.post('/webhooks/stripe', async (req, res) => {
  const event = req.body; // verifica firma
  const provider_ref = event?.data?.object?.id;
  await db.query(
    `UPDATE payments SET status='captured', confirmed_at=now()
     WHERE provider='stripe' AND provider_ref=$1 AND status='pending'`,
    [provider_ref]
  );
  res.sendStatus(200);
});

r.post('/webhooks/paypal', async (req, res) => {
  const event = req.body; // verifica firma
  const provider_ref = event?.resource?.id;
  await db.query(
    `UPDATE payments SET status='captured', confirmed_at=now()
     WHERE provider='paypal' AND provider_ref=$1 AND status='pending'`,
    [provider_ref]
  );
  res.sendStatus(200);
});

export default r;
