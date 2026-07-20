const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.Mixed, // String for customer, ObjectId for agent
    required: function() {
      return this.senderRole !== 'ai';
    }
  },
  senderRole: {
    type: String,
    enum: ['customer', 'agent', 'ai'],
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const chatSchema = new mongoose.Schema({
  customerId: {
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
  assignedAgentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  mode: {
    type: String,
    enum: ['ai', 'human'],
    default: 'ai',
    index: true
  },
  messages: [messageSchema],
  lastInteraction: {
    type: Date,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  }
}, {
  timestamps: true
});

// Compound index for efficient lookup of a customer's chats within a company
chatSchema.index({ customerId: 1, companyId: 1 });
chatSchema.index({ companyId: 1, status: 1, lastInteraction: -1 });

/**
 * Atomically add a message using $push — prevents race conditions when
 * multiple messages arrive concurrently (old load-modify-save approach
 * would silently drop messages with concurrent writes).
 */
chatSchema.statics.addMessageById = async function(chatId, messageData) {
  const result = await this.findByIdAndUpdate(
    chatId,
    {
      $push: { messages: messageData },
      $set:  { lastInteraction: new Date(), status: 'open' }
    },
    { new: false } // We don't need the full document returned
  );
  return result;
};

// Convenience instance method (wraps static for backward compat)
chatSchema.methods.addMessage = function(messageData) {
  return this.constructor.addMessageById(this._id, messageData);
};

// Method to get last N messages
chatSchema.methods.getLastMessages = function(count = 15) {
  return this.messages.slice(-count);
};

// Method to check if chat is active
chatSchema.methods.isActive = function() {
  return this.status === 'open';
};

/**
 * Atomically take over a chat by an agent.
 */
chatSchema.statics.takeOverById = async function(chatId, agentId) {
  return this.findByIdAndUpdate(
    chatId,
    {
      $set: {
        mode: 'human',
        assignedAgentId: agentId,
        lastInteraction: new Date()
      }
    },
    { new: true }
  );
};

// Instance method wrapper for takeOver
chatSchema.methods.takeOver = function(agentId) {
  return this.constructor.takeOverById(this._id, agentId);
};

module.exports = mongoose.model('Chat', chatSchema);
