import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { UPLOAD_DIR } from '../config/paths.js';

export const MAX_FILE_MB = 25;
const BLOCKED_EXT = ['.exe', '.msi', '.bat', '.cmd', '.com', '.scr'];

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) =>
    cb(null, crypto.randomBytes(16).toString('hex') + path.extname(file.originalname).toLowerCase()),
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (BLOCKED_EXT.includes(ext)) {
    const err = new Error('This file type is not allowed');
    err.status = 400;
    return cb(err);
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_MB * 1024 * 1024 } });

export const uploadSingle = upload.single('file');