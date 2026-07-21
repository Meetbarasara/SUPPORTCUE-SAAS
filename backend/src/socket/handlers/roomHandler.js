const User = require('../../models/User');
const authorizeChat = require('../authorizeChat');

module.exports = (socket, io) => {
  // ── Join a specific chat room ──
  socket.on('joinChat', async (data) => {
    try {
      const { chatId } = data || {};

      // Same check as sendMessage: joining is a read, and the room is where
      // live messages arrive. Agents used to be unchecked here entirely, so
      // any agent could join any company's chat and receive its history.
      const auth = await authorizeChat(socket, chatId);
      if (!auth.ok) {
        socket.emit('error', { message: auth.error });
        return;
      }

      const { chat } = auth;

      socket.join(chatId);
      console.log(`[Socket] ${auth.role} (${auth.senderId}) joined chat ${chatId}`);

      // Send chat history to the joining socket
      const lastMessages = chat.messages ? chat.messages.slice(-15) : [];
      socket.emit('chatHistory', {
        chatId,
        messages: lastMessages,
        mode: chat.mode,
        assignedAgentId: chat.assignedAgentId
      });

    } catch (error) {
      console.error('[Socket] Join chat error:', error.message);
      socket.emit('error', { message: 'Failed to join chat' });
    }
  });

  // ── Leave a chat room ──
  socket.on('leaveChat', async (data) => {
    try {
      const { chatId, userId } = data;
      if (!chatId || !userId) {
        socket.emit('error', { message: 'Chat ID and User ID are required' });
        return;
      }
      socket.leave(chatId);
      console.log(`[Socket] ${socket.data.role} (${userId}) left chat ${chatId}`);
    } catch (error) {
      console.error('[Socket] Leave chat error:', error.message);
    }
  });

  // ── Join agent/superuser room ──
  socket.on('joinAgents', async () => {
    try {
      // Use the socket's own identity, not a userId from the payload. This
      // handler used to look up whatever id the client sent, so an agent could
      // pass another company's agent id and join that company's room —
      // receiving its escalation alerts and chat updates.
      const userId = socket.data.userId;
      if (!userId) {
        socket.emit('error', { message: 'Access denied. Customers cannot join agent rooms.' });
        return;
      }

      // Load user from DB to get their role and companyId
      const user = await User.findById(userId).lean();
      if (!user) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      if (user.role === 'superuser') {
        socket.join('superusers');
        console.log(`[Socket] Superuser ${userId} joined superusers room`);
        socket.emit('joinedAgents', { message: 'Joined superusers room' });
      } else if (user.role === 'agent' && user.companyId) {
        const companyRoom = `agents_${user.companyId.toString()}`;
        socket.join(companyRoom);
        console.log(`[Socket] Agent ${userId} joined ${companyRoom}`);
        socket.emit('joinedAgents', { message: 'Joined agents room' });
      } else {
        socket.emit('error', { message: 'Access denied or company not assigned.' });
      }
    } catch (error) {
      console.error('[Socket] Join agents error:', error.message);
      socket.emit('error', { message: 'Failed to join agents room' });
    }
  });

  // ── Typing indicator ──
  socket.on('typing', (data) => {
    const { chatId, userId, isTyping } = data || {};
    // socket.to() broadcasts to a room whether or not this socket is in it,
    // so require membership — which joinChat now only grants after the
    // tenant check above.
    if (!chatId || !socket.rooms.has(chatId)) return;
    socket.to(chatId).emit('userTyping', { userId, isTyping });
  });
};
