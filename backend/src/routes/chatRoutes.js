const express = require('express');
const router = express.Router();
const { auth, optionalAuth, requireAgent, companyAuth } = require('../middleware/auth');
const {
  createChat,
  getChat,
  getUserChats,
  getCompanyChats,
  takeOverChat,
  getActiveChats,
  closeChat
} = require('../controllers/chatController');

// Public route for chat creation (widget)
router.post('/create', createChat);

// Protected routes (place specific routes before parameterized ones)
router.get('/user-chats', optionalAuth, getUserChats);
router.get('/company/history', companyAuth, getCompanyChats);
router.post('/takeover', auth, requireAgent, takeOverChat);
router.get('/active', auth, requireAgent, getActiveChats);
router.put('/:chatId/close', auth, requireAgent, closeChat);
router.get('/:chatId', optionalAuth, getChat);

module.exports = router;
