import { Router } from 'express';
import auth from '../middleware/auth.js';
import roomRole from '../middleware/roomRole.js';
import { uploadSingle } from '../middleware/upload.js';
import {
  uploadFile, listFiles, downloadFile, deleteFile,
  listAccess, grantAccess, revokeAccess, convertToText,
} from '../controllers/fileController.js';

const router = Router();

router.post('/rooms/:roomId/files', auth, roomRole('editor'), uploadSingle, uploadFile);
router.get('/rooms/:roomId/files', auth, roomRole('viewer'), listFiles);
router.get('/files/:fileId/download', auth, downloadFile);
router.delete('/files/:fileId', auth, deleteFile);

router.post('/files/:fileId/convert-to-text', auth, convertToText);

router.get('/files/:fileId/access', auth, listAccess);
router.post('/files/:fileId/access', auth, grantAccess);
router.delete('/files/:fileId/access/:email', auth, revokeAccess);

export default router;