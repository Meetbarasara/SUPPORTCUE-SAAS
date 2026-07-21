const mongoose = require('mongoose');

/**
 * An invitation for one person to join one company as an agent.
 *
 * Agents used to self-register against any companyId they knew, and that id is
 * printed in the embed snippet on every customer's public site — so reading a
 * company id off a homepage was enough to join it. Company membership now has
 * to be granted by that company, and this is the grant.
 *
 * The token is stored as a SHA-256 hash: only the emailed link carries the real
 * value, so a leaked database dump cannot be used to accept outstanding
 * invitations.
 */
const agentInviteSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  acceptedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// The company dashboard lists outstanding invitations, newest first.
agentInviteSchema.index({ companyId: 1, acceptedAt: 1, createdAt: -1 });

// One live invitation per email per company; re-inviting replaces the old one.
agentInviteSchema.index({ companyId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('AgentInvite', agentInviteSchema);
