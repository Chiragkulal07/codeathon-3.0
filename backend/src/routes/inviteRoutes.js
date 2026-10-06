import { Router } from 'express';
import auth from '../middleware/auth.js';
import { myInvites, acceptInvite, declineInvite } from '../controllers/roomController.js';

const router = Router();
router.use(auth);

router.get('/mine', myInvites);
router.post('/:inviteId/accept', acceptInvite);
router.post('/:inviteId/decline', declineInvite);

export default router;