import { Router } from 'express';
import { verifyEmail, verifyWhatsApp } from '../controllers/verifyController.js';
const r = Router();
r.post('/verify/email', verifyEmail);
r.post('/verify/whatsapp', verifyWhatsApp);
export default r;
