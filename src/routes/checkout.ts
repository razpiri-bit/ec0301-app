import { Router } from 'express';
import { createCheckout } from '../controllers/paymentsController.js';
const r = Router();
r.post('/checkout', createCheckout);
export default r;
