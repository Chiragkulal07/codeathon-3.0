import { Router } from 'express';
import auth from '../middleware/auth.js';
import { register, login, refresh, me } from '../controllers/authController.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.get('/me', auth, me);

export default router;