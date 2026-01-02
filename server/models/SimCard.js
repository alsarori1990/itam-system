import mongoose from 'mongoose';

const simCardSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  serialNumber: String,
  phoneNumber: {
    type: String,
    required: true,
    unique: true
  },
  provider: String,
  type: String,
  planName: String,
  assignedTo: String,
  department: String,
  branch: String,
  status: {
    type: String,
    default: 'ACTIVE'
  },
  cost: Number,
  activationDate: String,
  expiryDate: String,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
simCardSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const SimCard = mongoose.model('SimCard', simCardSchema);

export default SimCard;
