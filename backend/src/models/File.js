import mongoose from 'mongoose';

const grantSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true },
    role: { type: String, enum: ['viewer', 'editor'], default: 'viewer' },
    grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    grantedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const fileSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    originalName: { type: String, required: true },
    version: { type: Number, default: 1 }, // bumps on every collaborative edit
    storageName: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: String,
    accessGrants: { type: [grantSchema], default: [] }, // used in Phase 4
  },
  { timestamps: true }
);

export default mongoose.model('File', fileSchema);