import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  requesterName: {
    type: String,
    required: true,
    trim: true
  },
  requesterEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  branch: {
    type: String,
    required: true,
    index: true
  },
  channel: {
    type: String,
    required: true,
    enum: ['WhatsApp', 'Email', 'Phone', 'Walk-in', 'Portal']
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  subcategory: {
    type: String
  },
  priority: {
    type: String,
    required: true,
    enum: ['منخفض', 'متوسط', 'عالي', 'حرج'],
    index: true
  },
  description: {
    type: String,
    required: true
  },
  attachmentImage: {
    type: String
  },
  linkedAssetId: {
    type: String,
    ref: 'Asset'
  },
  status: {
    type: String,
    required: true,
    enum: ['جديد', 'تم التعيين', 'جاري العمل', 'في الانتظار', 'تم الحل', 'مغلقة', 'معاد فتحها'],
    default: 'جديد',
    index: true
  },
  assignedTo: {
    type: String,
    index: true
  },
  resolutionType: {
    type: String,
    enum: ['ROUTINE', 'SPECIALIZED']
  },
  resolutionDetails: {
    type: String
  },
  receivedAt: {
    type: Date,
    required: true,
    index: true
  },
  isReceivedAtAdjusted: {
    type: Boolean,
    default: false
  },
  startedAt: {
    type: Date
  },
  resolvedAt: {
    type: Date
  },
  closedAt: {
    type: Date
  },
  responseTimeMinutes: {
    type: Number
  },
  resolutionTimeMinutes: {
    type: Number
  }
}, {
  timestamps: true
});

// Indexes for performance
ticketSchema.index({ requesterName: 'text', description: 'text' });
ticketSchema.index({ status: 1, branch: 1 });
ticketSchema.index({ receivedAt: -1 });
ticketSchema.index({ assignedTo: 1, status: 1 });

// Calculate response and resolution times before saving
ticketSchema.pre('save', function(next) {
  if (this.startedAt && this.receivedAt) {
    this.responseTimeMinutes = Math.round((this.startedAt - this.receivedAt) / 60000);
  }
  if (this.resolvedAt && this.receivedAt) {
    this.resolutionTimeMinutes = Math.round((this.resolvedAt - this.receivedAt) / 60000);
  }
  next();
});

export default mongoose.model('Ticket', ticketSchema);
