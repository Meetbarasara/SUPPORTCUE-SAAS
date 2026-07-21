const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  login,
  getProfile,
  logout,
  acceptCompanyInvite,
  verifyCompanyInvite,
  companyLogin
} = require('../controllers/authController');
const {
  verifyAgentInvite,
  acceptAgentInvite
} = require('../controllers/agentInviteController');

// Public routes
//
// There is deliberately no POST /register. It accepted any companyId, and that
// id is published in the embed snippet on every customer's site, so anyone
// could join any company as an agent. Agents now arrive by invitation only —
// the company issues one from its dashboard and the two routes below redeem it.
router.post('/login', login);
router.post('/company/login', companyLogin);
router.post('/company/accept-invite', acceptCompanyInvite);
router.get('/company/verify-invite', verifyCompanyInvite);
router.post('/agent/accept-invite', acceptAgentInvite);
router.get('/agent/verify-invite', verifyAgentInvite);

// Protected routes
router.get('/profile', auth, getProfile);
router.post('/logout', auth, logout);

module.exports = router;
