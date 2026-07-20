const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required']
  },
  role: {
    type: String,
    enum: ['agent', 'superuser'],
    default: 'agent'
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null
  },
}, {
  timestamps: true
});

// Virtual for password (not stored)
userSchema.virtual('password').set(function(password) {
  this.passwordHash = bcrypt.hashSync(password, 12);
});

// Method to check password
userSchema.methods.checkPassword = function(password) {
  return bcrypt.compareSync(password, this.passwordHash);
};

// Method to get public profile (no password)
userSchema.methods.toPublicJSON = function() {
  const user = this.toObject();
  delete user.passwordHash;
  return user;
};

module.exports = mongoose.model('User', userSchema);
