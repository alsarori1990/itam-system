import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  vendor: String,
  type: String,
  category: String,
  billingCycle: String,
  owner: String,
  status: {
    type: String,
    default: 'ACTIVE'
  },
  autoRenewal: {
    type: Boolean,
    default: false
  },
  currentRenewalId: String,
  nextRenewalDate: String,
  totalSeats: Number,
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
subscriptionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;
