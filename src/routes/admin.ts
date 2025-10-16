import { Router } from 'express';
import { approvePayment } from '../controllers/adminController.js';
const r = Router();
// proteger con auth/roles en producción
r.post('/payments/:id/approve', approvePayment);
export default r;
