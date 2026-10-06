import mongoose from 'mongoose';

const downloadLogSchema = new mongoose.Schema({
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true, index: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  linkId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShareLink' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: { type: String, default: 'anonymous' },
  source: { type: String, enum: ['room', 'link'], required: true },
  ip: String,
  at: { type: Date, default: Date.now },
});

export default mongoose.model('DownloadLog', downloadLogSchema);