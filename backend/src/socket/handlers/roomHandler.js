const User = require('../../models/User');
const Chat = require('../../models/Chat');

module.exports = (socket, io) => {
  // ── Join a specific chat room ──
  socket.on('joinChat', async (data) => {
    try {
      const { chatId, userId } = data;

      if (!chatId || !userId) {
        socket.emit('error', { message: 'Chat ID and User ID are required' });
        return;
      }

      // Verify the chat exists and the user has access
      const chat = await Chat.findById(chatId).lean();
      if (!chat) {
        socket.emit('error', { message: 'Chat not found' });
        return;
      }

      // Customers can only join their own chats
      if (socket.data.role === 'customer') {
        if (chat.customerId !== userId && chat.customerId !== socket.data.customerId) {
          socket.emit('error', { message: 'Access denied to this chat' });
          return;
        }
      }

      socket.join(chatId);
      console.log(`[Socket] ${socket.data.role} (${userId}) joined chat ${chatId}`);

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
  socket.on('joinAgents', async (data) => {
    try {
      const { userId } = data;
      if (!userId) {
        socket.emit('error', { message: 'User ID is required' });
        return;
      }

      // The socket must be authenticated as an agent or superuser
      if (socket.data.role === 'customer') {
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
    const { chatId, userId, isTyping } = data;
    if (!chatId) return;
    socket.to(chatId).emit('userTyping', { userId, isTyping });
  });
};
