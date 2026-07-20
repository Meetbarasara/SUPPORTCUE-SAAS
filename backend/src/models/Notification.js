const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  type: {
    type: String,
    enum: ['agent_assigned', 'escalation_request'],
    required: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
notificationSchema.index({ isRead: 1, createdAt: -1 });
notificationSchema.index({ chatId: 1 });

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  return this.save();
};

module.exports = mongoose.model('Notification', notificationSchema);
