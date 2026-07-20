const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  fileName: {
    type: String,
    required: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  totalChunks: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['processing', 'ready', 'error'],
    default: 'processing',
    index: true
  },
  errorMessage: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Document', documentSchema);
