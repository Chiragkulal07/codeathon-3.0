import { Router } from 'express';
import auth from '../middleware/auth.js';
import { getDashboard } from '../controllers/dashboardController.js';

const router = Router();
router.get('/dashboard', auth, getDashboard);

export default router;