const Chat = require('../../models/Chat');
const User = require('../../models/User');
const Notification = require('../../models/Notification');

module.exports = (socket, io) => {
  // Handle chat takeover
  socket.on('takeOver', async (data) => {
    try {
      const { chatId, agentId } = data;

      if (!chatId || !agentId) {
        socket.emit('error', { message: 'Chat ID and Agent ID are required' });
        return;
      }

      const chat = await Chat.findById(chatId);
      const agent = await User.findById(agentId);

      if (!chat) {
        socket.emit('error', { message: 'Chat not found' });
        return;
      }

      if (!agent || agent.role !== 'agent') {
        socket.emit('error', { message: 'Invalid agent' });
        return;
      }

      // We expect the REST API to have already updated the DB, 
      // but just in case, this is idempotent
      if (chat.mode !== 'human') {
        await chat.takeOver(agentId);
      }

      const chatTakenData = {
        chatId,
        agentId,
        agentName: agent.name,
        mode: 'human'
      };

      // Emit takeover event to chat room
      io.to(chatId).emit('chatTaken', chatTakenData);

      // Emit takeover event to agents room and superusers
      const companyRoom = `agents_${chat.companyId.toString()}`;
      io.to(companyRoom).to('superusers').emit('chatTaken', chatTakenData);

      // Emit a takeover system message
      const takeoverMessage = {
        senderRole: 'ai',
        text: `This conversation has been transferred to ${agent.name}, a human support agent. They will assist you shortly.`,
        createdAt: new Date()
      };
      
      io.to(chatId).emit('receiveMessage', { chatId, message: takeoverMessage });
      console.log(`Chat ${chatId} taken over by agent ${agentId} via Socket`);

    } catch (error) {
      console.error('Take over error:', error.message);
      socket.emit('error', { message: 'Failed to take over chat' });
    }
  });

  // Customer explicitly requests a human agent
  socket.on('requestHuman', async (data) => {
    try {
      const { chatId, customerId, reason } = data;

      if (!chatId || !customerId) {
        socket.emit('error', { message: 'Chat ID and Customer ID are required' });
        return;
      }

      const chat = await Chat.findById(chatId);
      if (!chat) {
        socket.emit('error', { message: 'Chat not found' });
        return;
      }

      const notification = new Notification({
        chatId: chat._id,
        type: 'escalation_request',
        payload: {
          message: reason || 'Customer requested a human agent',
          customerId: customerId
        }
      });
      await notification.save();

      // Notify agents of that company and superusers
      const companyRoom = `agents_${chat.companyId.toString()}`;
      io.to(companyRoom).to('superusers').emit('escalationRequest', {
        chatId: chat._id,
        customerId: customerId,
        message: notification.payload.message,
        notificationId: notification._id
      });

      // Confirm to the customer in chat
      const confirmMessage = {
        senderRole: 'ai',
        text: 'Okay, I\'ll connect you with a human agent as soon as one is available.',
        createdAt: new Date()
      };
      await chat.addMessage(confirmMessage);
      io.to(chatId).emit('receiveMessage', { chatId, message: confirmMessage });
    } catch (error) {
      console.error('Request human error:', error.message);
      socket.emit('error', { message: 'Failed to request a human agent' });
    }
  });
};
