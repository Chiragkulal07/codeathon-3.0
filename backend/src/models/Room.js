import mongoose from 'mongoose';

export const ROLES = ['viewer', 'editor', 'admin', 'owner'];

const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true, lowercase: true },
    role: { type: String, enum: ROLES, required: true },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [memberSchema],
  },
  { timestamps: true }
);

roomSchema.index({ 'members.userId': 1 });

export default mongoose.model('Room', roomSchema);