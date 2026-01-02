import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    index: true
  },
  brand: {
    type: String,
    trim: true
  },
  serialNumber: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  purchaseDate: {
    type: Date,
    required: true
  },
  warrantyExpiry: {
    type: Date
  },
  status: {
    type: String,
    required: true,
    enum: ['جديد', 'مستخدم', 'في الصيانة', 'معطل / يحتاج صيانة', 'مباع', 'تم الإتلاف', 'خارج الخدمة (مخزن)'],
    index: true
  },
  assignedTo: {
    type: String,
    trim: true,
    index: true
  },
  location: {
    type: String,
    required: true,
    index: true
  },
  image: {
    type: String
  },
  notes: {
    type: String
  },
  disposalDate: {
    type: Date
  },
  disposalNotes: {
    type: String
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for performance
assetSchema.index({ name: 'text', serialNumber: 'text', brand: 'text' });
assetSchema.index({ status: 1, location: 1 });
assetSchema.index({ warrantyExpiry: 1 });

// Virtual for warranty status
assetSchema.virtual('isWarrantyExpired').get(function() {
  return this.warrantyExpiry && this.warrantyExpiry < new Date();
});

export default mongoose.model('Asset', assetSchema);
