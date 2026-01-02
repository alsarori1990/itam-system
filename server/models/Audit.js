import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  action: {
    type: String,
    required: true
  },
  userId: String,
  userName: String,
  targetType: String,
  targetId: String,
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const Audit = mongoose.model('Audit', auditSchema);

export default Audit;
