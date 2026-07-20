const mongoose = require('mongoose');

const documentChunkSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  chunkIndex: {
    type: Number,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  // 768-dimensional vector from Gemini text-embedding-004
  embedding: {
    type: [Number],
    required: true
  },
  metadata: {
    page: {
      type: Number,
      default: null
    }
  }
}, {
  timestamps: true
});

// Compound index for efficient per-company queries
documentChunkSchema.index({ companyId: 1, documentId: 1 });

module.exports = mongoose.model('DocumentChunk', documentChunkSchema);
