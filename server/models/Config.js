import mongoose from 'mongoose';

const ConfigSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    enum: ['smtp_settings']
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: String,
    default: 'system'
  }
}, {
  timestamps: true
});

export default mongoose.model('Config', ConfigSchema);
