import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // Legacy fields
  action: String,
  userId: String,
  userName: String,
  targetType: String,
  targetId: String,
  ipAddress: String,
  userAgent: String,
  
  // New unified fields
  assetId: {
    type: String,
    index: true
  },
  ticketId: {
    type: String,
    index: true
  },
  subscriptionId: {
    type: String,
    index: true
  },
  simCardId: {
    type: String,
    index: true
  },
  actionType: {
    type: String,
    enum: [
      'CREATE', 
      'UPDATE', 
      'DELETE', 
      'STATUS_CHANGE', 
      'TICKET_STATUS_CHANGE',
      'TICKET_DELETE',
      'ASSIGN', 
      'ESCALATE', 
      'CLOSE', 
      'REOPEN', 
      'TICKET_TIME_ADJUST'
    ]
  },
  details: String,
  changes: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }],
  user: String,
  reason: String,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound indexes for common queries
auditSchema.index({ ticketId: 1, timestamp: -1 });
auditSchema.index({ assetId: 1, timestamp: -1 });

const Audit = mongoose.model('Audit', auditSchema);

export default Audit;
