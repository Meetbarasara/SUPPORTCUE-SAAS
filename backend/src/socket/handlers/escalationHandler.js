const Chat = require('../../models/Chat');
const Notification = require('../../models/Notification');
const authorizeChat = require('../authorizeChat');

module.exports = (socket, io) => {
  // Handle chat takeover
  socket.on('takeOver', async (data) => {
    try {
      const { chatId } = data || {};

      // Identity and tenancy both come from the socket. `agentId` used to be
      // read from the payload and only checked for role, so an agent at one
      // company could take over another company's conversation.
      const auth = await authorizeChat(socket, chatId);
      if (!auth.ok) {
        socket.emit('error', { message: auth.error });
        return;
      }

      const { chat, user } = auth;
      if (!user || user.role !== 'agent') {
        socket.emit('error', { message: 'Only an agent can take over a chat' });
        return;
      }

      // The REST route is the durable write and normally gets here first; this
      // stays idempotent so the two cannot fight.
      if (chat.mode !== 'human') {
        await Chat.takeOverById(chatId, user._id);
      }

      const chatTakenData = {
        chatId,
        agentId: String(user._id),
        agentName: user.name,
        mode: 'human'
      };

      io.to(chatId).emit('chatTaken', chatTakenData);

      const companyRoom = `agents_${chat.companyId.toString()}`;
      io.to(companyRoom).to('superusers').emit('chatTaken', chatTakenData);

      const takeoverMessage = {
        senderRole: 'ai',
        text: `This conversation has been transferred to ${user.name}, a human support agent. They will assist you shortly.`,
        createdAt: new Date()
      };

      io.to(chatId).emit('receiveMessage', { chatId, message: takeoverMessage });
      console.log(`[Socket] Chat ${chatId} taken over by agent ${user._id}`);

    } catch (error) {
      console.error('Take over error:', error.message);
      socket.emit('error', { message: 'Failed to take over chat' });
    }
  });

  // Customer explicitly requests a human agent
  socket.on('requestHuman', async (data) => {
    try {
      const { chatId, reason } = data || {};

      // Without this, any socket could raise an escalation against any chat in
      // the database — including another company's.
      const auth = await authorizeChat(socket, chatId);
      if (!auth.ok) {
        socket.emit('error', { message: auth.error });
        return;
      }

      const { chat, role, senderId } = auth;
      if (role !== 'customer') {
        socket.emit('error', { message: 'Only the customer can request a human' });
        return;
      }

      const notification = new Notification({
        chatId: chat._id,
        type: 'escalation_request',
        payload: {
          message: typeof reason === 'string' && reason.trim() ? reason.trim() : 'Customer requested a human agent',
          customerId: senderId
        }
      });
      await notification.save();

      // Notify agents of that company and superusers
      const companyRoom = `agents_${chat.companyId.toString()}`;
      io.to(companyRoom).to('superusers').emit('escalationRequest', {
        chatId: chat._id,
        customerId: senderId,
        message: notification.payload.message,
        notificationId: notification._id
      });

      // Confirm to the customer in chat
      const confirmMessage = {
        senderRole: 'ai',
        text: 'Okay, I\'ll connect you with a human agent as soon as one is available.',
        createdAt: new Date()
      };
      await Chat.addMessageById(chat._id, confirmMessage);
      io.to(chatId).emit('receiveMessage', { chatId, message: confirmMessage });
    } catch (error) {
      console.error('Request human error:', error.message);
      socket.emit('error', { message: 'Failed to request a human agent' });
    }
  });
};
