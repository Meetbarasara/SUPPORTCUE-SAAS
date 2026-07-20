const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Company email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    default: null
  },
  invitationToken: {
    type: String,
    default: null
  },
  invitationExpires: {
    type: Date,
    default: null
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  systemPrompt: {
    type: String,
    default: 'You are a helpful AI customer support agent. Be concise, polite, and helpful. If you are not sure about something, offer to escalate to a human agent.',
    trim: true
  },
  settings: {
    maxDocuments: {
      type: Number,
      default: 10
    },
    maxFileSizeMB: {
      type: Number,
      default: 10
    }
  },
}, {
  timestamps: true
});

// Generate slug from name
companySchema.statics.generateSlug = function(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Virtual for password (not stored)
companySchema.virtual('password').set(function(password) {
  this.passwordHash = bcrypt.hashSync(password, 12);
});

// Method to check password
companySchema.methods.checkPassword = function(password) {
  if (!this.passwordHash) return false;
  return bcrypt.compareSync(password, this.passwordHash);
};

// Method to get public profile (no password/tokens)
companySchema.methods.toPublicJSON = function() {
  const company = this.toObject();
  delete company.passwordHash;
  delete company.invitationToken;
  delete company.invitationExpires;
  return company;
};

module.exports = mongoose.model('Company', companySchema);
