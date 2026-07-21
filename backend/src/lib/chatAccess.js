/**
 * May this dashboard user act on this chat?
 *
 * One rule, shared by the socket layer (via socket/authorizeChat.js) and the
 * REST controllers, because the two used to disagree: sockets checked the
 * company and takeover/close only checked that the caller was *an* agent, not
 * *this company's* agent.
 *
 * @param {{role: string, companyId: any}} user  a User record, not a token claim
 * @param {{companyId: any}} chat
 */
function userMayAccessChat(user, chat) {
  if (!user || !chat) return false;

  // Superusers deliberately span tenants — that is what the 'superusers' room
  // is for. The role must come from the stored user, never from a request.
  if (user.role === 'superuser') return true;

  if (user.role !== 'agent' || !user.companyId) return false;

  return String(user.companyId) === String(chat.companyId);
}

module.exports = { userMayAccessChat };
