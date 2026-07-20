const express = require('express');
const router = express.Router();
const { auth, requireAgent, requireSuperuser } = require('../middleware/auth');
const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification
} = require('../controllers/notificationController');

// All notification routes require at least agent authentication
const requireAgentOrSuperuser = [auth, async (req, res, next) => {
  if (req.user.role === 'agent' || req.user.role === 'superuser') return next();
  return res.status(403).json({ error: 'Access denied.' });
}];

// GET /api/notifications?unreadOnly=true
router.get('/', requireAgentOrSuperuser, getNotifications);

// PUT /api/notifications/read-all  (must be before /:id routes)
router.put('/read-all', requireAgentOrSuperuser, markAllNotificationsRead);

// PUT /api/notifications/:id/read
router.put('/:id/read', requireAgentOrSuperuser, markNotificationRead);

// DELETE /api/notifications/:id
router.delete('/:id', requireAgentOrSuperuser, deleteNotification);

module.exports = router;
