import { Router } from 'express';
import auth from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import {
  createLink, listFileLinks, revokeLink, resolveLink, downloadViaLink,
} from '../controllers/linkController.js';
import { listMyLinks } from '../controllers/historyController.js';

const router = Router();

router.get('/links', auth, listMyLinks);
router.post('/files/:fileId/links', auth, createLink);
router.get('/files/:fileId/links', auth, listFileLinks);
router.patch('/links/:linkId/revoke', auth, revokeLink);

router.get('/s/:code', optionalAuth, resolveLink);
router.get('/s/:code/download', optionalAuth, downloadViaLink);
router.post('/s/:code/download', optionalAuth, downloadViaLink);

export default router;