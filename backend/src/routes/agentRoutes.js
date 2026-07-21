const express = require('express');
const router = express.Router();
const { companyAuth } = require('../middleware/auth');
const {
  inviteAgent,
  listAgents,
  revokeInvite
} = require('../controllers/agentInviteController');

// Managing who works for a company is the company's own business, so these
// use the company token rather than a user token.
router.get('/', companyAuth, listAgents);
router.post('/invite', companyAuth, inviteAgent);
router.delete('/invite/:id', companyAuth, revokeInvite);

module.exports = router;
