import { Router } from 'express';
import auth from '../middleware/auth.js';
import roomRole from '../middleware/roomRole.js';
import {
  createRoom, listRooms, getRoom, updateRoom, deleteRoom,
  inviteMember, listRoomInvites, changeRole, removeMember,
} from '../controllers/roomController.js';

const router = Router();
router.use(auth);

router.post('/', createRoom);
router.get('/', listRooms);
router.get('/:roomId', roomRole('viewer'), getRoom);
router.patch('/:roomId', roomRole('admin'), updateRoom);
router.delete('/:roomId', roomRole('owner'), deleteRoom);

router.post('/:roomId/invites', roomRole('admin'), inviteMember);
router.get('/:roomId/invites', roomRole('admin'), listRoomInvites);

router.patch('/:roomId/members/:userId', roomRole('admin'), changeRole);
router.delete('/:roomId/members/:userId', roomRole('viewer'), removeMember);

export default router;