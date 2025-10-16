import { Router } from 'express';
import { startRegistration } from '../controllers/registerController.js';
const r = Router();
r.post('/register', startRegistration);
export default r;
