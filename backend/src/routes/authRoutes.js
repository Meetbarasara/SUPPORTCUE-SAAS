const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  register,
  login,
  getProfile,
  logout,
  acceptCompanyInvite,
  verifyCompanyInvite,
  companyLogin
} = require('../controllers/authController');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/company/login', companyLogin);
router.post('/company/accept-invite', acceptCompanyInvite);
router.get('/company/verify-invite', verifyCompanyInvite);

// Protected routes
router.get('/profile', auth, getProfile);
router.post('/logout', auth, logout);

module.exports = router;
