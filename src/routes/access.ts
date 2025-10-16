import { Router } from 'express';
import { accessLogin, changeAccessCode } from '../controllers/accessController.js';
const r = Router();
r.post('/access/login', accessLogin);
r.post('/access/change', changeAccessCode);
export default r;
