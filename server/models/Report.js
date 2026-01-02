import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  type: String,
  description: String,
  generatedBy: String,
  data: mongoose.Schema.Types.Mixed,
  filters: mongoose.Schema.Types.Mixed,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Report = mongoose.model('Report', reportSchema);

export default Report;
