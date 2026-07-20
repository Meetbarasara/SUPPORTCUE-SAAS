const Notification = require('../models/Notification');

/**
 * GET /api/notifications
 * Returns unread notifications for the authenticated agent/superuser.
 * Agents see notifications for their company only; superusers see all.
 */
const getNotifications = async (req, res) => {
  try {
    const { unreadOnly } = req.query;
    let query = {};

    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    // Fetch notifications, newest first, limit to 50
    const notifications = await Notification.find(query)
      .populate('chatId', 'customerId companyId mode')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // If agent, filter to only their company's chats
    let filtered = notifications;
    if (req.user && req.user.role === 'agent' && req.user.companyId) {
      const agentCompanyId = req.user.companyId.toString();
      filtered = notifications.filter(n =>
        n.chatId && n.chatId.companyId && n.chatId.companyId.toString() === agentCompanyId
      );
    }

    res.json({ notifications: filtered, total: filtered.length });
  } catch (error) {
    console.error('Get notifications error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read.
 */
const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Mark notification read error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PUT /api/notifications/read-all
 * Mark all unread notifications as read (for the current agent's scope).
 */
const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { $set: { isRead: true } });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * DELETE /api/notifications/:id
 * Delete a notification.
 */
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndDelete(id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification
};
