const User = require('../models/User');
const Company = require('../models/Company');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const crypto = require('crypto');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, config.JWT_SECRET, { expiresIn: '7d' });
};

// Register new user
const register = async (req, res) => {
  try {
    const { name, email, password, role = 'agent' } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Allow only valid roles. Superuser can only be created via seed script or by an existing superuser.
    const allowedPublicRoles = ['agent'];
    const safeRole = allowedPublicRoles.includes(role) ? role : 'agent';

    if (safeRole === 'agent' && !req.body.companyId) {
      return res.status(400).json({ error: 'Company ID is required for agent registration' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password, // Virtual setter will hash the password
      role: safeRole,
      companyId: req.body.companyId || null
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Return user info (without password) and token
    res.status(201).json({
      message: 'User registered successfully',
      user: user.toPublicJSON(),
      token
    });

  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = user.checkPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user._id);

    // Return user info and token
    res.json({
      message: 'Login successful',
      user: user.toPublicJSON(),
      token
    });

  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    res.json({
      user: req.user.toPublicJSON()
    });
  } catch (error) {
    console.error('Get profile error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Accept company invite
const acceptCompanyInvite = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const company = await Company.findOne({
      invitationToken: token,
      invitationExpires: { $gt: Date.now() }
    });

    if (!company) {
      return res.status(400).json({ error: 'Invalid or expired invitation token' });
    }

    // Set password and clear token
    company.password = password; // Uses virtual setter
    company.invitationToken = null;
    company.invitationExpires = null;
    await company.save();

    res.json({ message: 'Password set successfully. You can now log in.' });
  } catch (error) {
    console.error('Accept company invite error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify company invite (check if valid/expired)
const verifyCompanyInvite = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const company = await Company.findOne({
      invitationToken: token,
      invitationExpires: { $gt: Date.now() }
    });

    if (!company) {
      return res.status(400).json({ error: 'Invalid or expired invitation token' });
    }

    res.json({ message: 'Token is valid' });
  } catch (error) {
    console.error('Verify company invite error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Login company
const companyLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const company = await Company.findOne({ email });
    if (!company) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!company.checkPassword(password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token specific for company
    const token = jwt.sign({ companyId: company._id }, config.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      company: company.toPublicJSON(),
      token
    });
  } catch (error) {
    console.error('Company login error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  logout,
  acceptCompanyInvite,
  verifyCompanyInvite,
  companyLogin
};
