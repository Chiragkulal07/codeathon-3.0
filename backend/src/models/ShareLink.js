import mongoose from 'mongoose';

const shareLinkSchema = new mongoose.Schema(
  {
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true, index: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    code: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    hasPassword: { type: Boolean, default: false },
    passwordHash: { type: String, select: false },
    maxDownloads: { type: Number, default: null },
    downloadCount: { type: Number, default: 0 },
    allowedEmails: { type: [String], default: [] },
    allowEdit: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'revoked'], default: 'active' },
  },
  { timestamps: true }
);

export default mongoose.model('ShareLink', shareLinkSchema);