const mongoose = require('mongoose');

const customerSessionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Ensure a user can only have one session per company
customerSessionSchema.index({ userId: 1, companyId: 1 }, { unique: true });

// Helper to find or create a session
customerSessionSchema.statics.findOrCreate = async function(userId, companyId, metadata = {}) {
  let session = await this.findOne({ userId, companyId });
  if (!session) {
    session = new this({ userId, companyId, metadata });
    await session.save();
  }
  return session;
};

module.exports = mongoose.model('CustomerSession', customerSessionSchema);
