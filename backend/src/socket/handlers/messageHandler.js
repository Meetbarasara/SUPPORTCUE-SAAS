const Chat = require('../../models/Chat');
const Company = require('../../models/Company');
const Notification = require('../../models/Notification');
const geminiService = require('../../services/geminiService');
const ragService = require('../../services/ragService');
const authorizeChat = require('../authorizeChat');

const MAX_MESSAGE_LENGTH = 4000;

module.exports = (socket, io) => {
  socket.on('sendMessage', async (payload) => {
    try {
      const { chatId, text } = payload || {};

      if (typeof text !== 'string' || !text.trim()) {
        socket.emit('error', { message: 'Message text is required' });
        return;
      }

      if (text.length > MAX_MESSAGE_LENGTH) {
        socket.emit('error', { message: 'Message is too long' });
        return;
      }

      // Who is sending, and may they write here? Both answers come from the
      // socket's own identity — the payload's `senderId`/`senderRole` are
      // ignored, so a socket cannot claim to be someone else. AI messages are
      // only ever appended server-side, below.
      const auth = await authorizeChat(socket, chatId);
      if (!auth.ok) {
        socket.emit('error', { message: auth.error });
        return;
      }

      const { chat, role: senderRole, senderId } = auth;

      if (chat.status === 'closed') {
        socket.emit('error', { message: 'This chat is closed' });
        return;
      }

      const messageData = {
        senderId,
        senderRole,
        text,
        createdAt: new Date()
      };

      // ── Atomic save — no more race conditions ──
      await Chat.addMessageById(chatId, messageData);

      // ── Emit to chat room only ──
      // The customer and agent are both in the chatId room.
      // Do NOT also emit to customer_ room — that would cause duplicate messages.
      io.to(chatId).emit('receiveMessage', { chatId, message: messageData });

      // Notify agents sidebar to refresh (debounced on frontend)
      io.to(`agents_${chat.companyId}`).to('superusers').emit('chatUpdated', { chatId });

      // ── AI mode: generate AI reply ──
      if (chat.mode === 'ai' && senderRole === 'customer') {
        io.to(chatId).emit('aiTyping', { chatId, isTyping: true });

        let ragContext = null;
        let companySystemPrompt = null;

        if (chat.companyId) {
          try {
            const [context, company] = await Promise.all([
              ragService.buildRAGContext(chat.companyId.toString(), text),
              Company.findById(chat.companyId, 'systemPrompt name').lean()
            ]);
            ragContext = context;
            companySystemPrompt = company?.systemPrompt || null;
          } catch (ragErr) {
            console.error('[RAG] Context retrieval failed:', ragErr.message);
          }
        }

        // Run AI reply asynchronously so we can ack the customer message immediately
        setImmediate(async () => {
          try {
            // Re-fetch the latest messages for the AI (after our push)
            const freshChat = await Chat.findById(chatId).select('messages').lean();
            const aiResponse = await geminiService.getGeminiReply(
              chatId,
              freshChat.messages,
              ragContext,
              companySystemPrompt
            );

            // Handle AI routing / handoff
            if (aiResponse.handoff_requested) {
              try {
                const notification = new Notification({
                  chatId: chat._id,
                  type: 'escalation_request',
                  payload: {
                    message: 'Customer requested a human agent (via AI Routing)',
                    customerId: chat.customerId
                  }
                });
                await notification.save();

                const companyRoom = `agents_${chat.companyId.toString()}`;
                console.log(`[Socket] Emitting escalationRequest to ${companyRoom} for chat ${chat._id}`);
                io.to(companyRoom).to('superusers').emit('escalationRequest', {
                  chatId: chat._id,
                  customerId: chat.customerId,
                  message: notification.payload.message,
                  notificationId: notification._id
                });
              } catch (err) {
                console.error('[Socket] Auto-escalation notification failed:', err.message);
              }
            }

            const aiText = aiResponse.answer ||
              (aiResponse.handoff_requested
                ? "I'm connecting you to a human agent right away."
                : "I'm sorry, I couldn't generate a response.");

            const aiMessageData = {
              senderRole: 'ai',
              text: aiText,
              createdAt: new Date()
            };

            // Atomic push for AI message too
            await Chat.addMessageById(chatId, aiMessageData);

            io.to(chatId).emit('aiTyping', { chatId, isTyping: false });
            io.to(chatId).emit('receiveMessage', { chatId, message: aiMessageData });

          } catch (error) {
            console.error('[Socket] AI reply generation failed:', error.message);
            io.to(chatId).emit('aiTyping', { chatId, isTyping: false });

            const fallbackMessage = {
              senderRole: 'ai',
              text: "I apologize, but I'm having trouble processing your request. Let me connect you with a human agent.",
              createdAt: new Date()
            };

            await Chat.addMessageById(chatId, fallbackMessage);
            io.to(chatId).emit('receiveMessage', { chatId, message: fallbackMessage });
          }
        });
      }
    } catch (error) {
      console.error('[Socket] Send message error:', error.message);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
};
