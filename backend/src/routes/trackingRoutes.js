import { Router } from 'express';
import auth from '../middleware/auth.js';
import {
  listNotifications, markRead, markAllRead, fileActivity,
} from '../controllers/trackingController.js';

const router = Router();

router.get('/notifications', auth, listNotifications);
router.patch('/notifications/read-all', auth, markAllRead);
router.patch('/notifications/:id/read', auth, markRead);
router.get('/files/:fileId/activity', auth, fileActivity);

export default router;