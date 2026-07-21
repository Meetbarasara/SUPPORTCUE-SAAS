const mongoose = require('mongoose');
const Chat = require('../models/Chat');
const User = require('../models/User');

/**
 * Decide who a socket really is, and whether it may read or write `chatId`.
 *
 * Identity is taken from `socket.data`, which the handshake middleware sets
 * and the browser cannot reach. Nothing in the event payload is trusted:
 *
 *   - The client used to send its own `senderRole`. The guards that checked it
 *     were written as `if (authenticatedId && authenticatedId !== senderId)`,
 *     so they only ran when that field happened to be set. A customer socket
 *     has no `socket.data.userId`, so claiming `senderRole: 'agent'` skipped
 *     the check entirely and stored the message as an agent.
 *   - Nothing compared the chat's `companyId` to the socket's, so any
 *     authenticated socket could read or write any chat in the database.
 *
 * The dashboard role is read from the database rather than from the handshake,
 * because `socket.handshake.auth.role` is whatever the client typed — it only
 * selects which secret to verify against, so it must not confer authority.
 *
 * @returns {{ok: false, error: string} | {ok: true, chat, role, senderId}}
 *          `role` is the value to store on the message ('customer' | 'agent').
 */
async function authorizeChat(socket, chatId) {
  if (!chatId || typeof chatId !== 'string' || !mongoose.Types.ObjectId.isValid(chatId)) {
    return { ok: false, error: 'Valid chat ID is required' };
  }

  const chat = await Chat.findById(chatId).lean();
  if (!chat) return { ok: false, error: 'Chat not found' };

  // ── Customer socket: must own the chat, and it must belong to the company
  //    the widget token was issued for. ──
  if (socket.data.customerId) {
    const ownsChat = chat.customerId === socket.data.customerId;
    const sameCompany = String(chat.companyId) === String(socket.data.companyId);
    if (!ownsChat || !sameCompany) {
      return { ok: false, error: 'Access denied to this chat' };
    }
    return { ok: true, chat, role: 'customer', senderId: chat.customerId };
  }

  // ── Dashboard socket. ──
  if (!socket.data.userId) {
    return { ok: false, error: 'Access denied to this chat' };
  }

  const user = await User.findById(socket.data.userId, 'role companyId').lean();
  if (!user) return { ok: false, error: 'Access denied to this chat' };

  // Superusers deliberately span tenants — that is what the 'superusers' room
  // is for — but the role comes from their user record, not their handshake.
  if (user.role === 'superuser') {
    return { ok: true, chat, role: 'agent', senderId: String(user._id) };
  }

  if (user.role !== 'agent' || !user.companyId) {
    return { ok: false, error: 'Access denied to this chat' };
  }

  if (String(user.companyId) !== String(chat.companyId)) {
    return { ok: false, error: 'Access denied to this chat' };
  }

  return { ok: true, chat, role: 'agent', senderId: String(user._id) };
}

module.exports = authorizeChat;
