/**
 * Tenant isolation for the socket layer.
 *
 *   npm test
 *
 * authorizeChat decides who a socket is and which chats it may read or write.
 * It is the only thing standing between two tenants on the live layer, so the
 * matrix below is the security contract, written down.
 *
 * Uses node:test and stubbed model lookups — no database, no network, so it
 * runs anywhere in well under a second.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Chat = require('../src/models/Chat');
const User = require('../src/models/User');

const id = () => new mongoose.Types.ObjectId();

// ── Fixtures: two companies that must never see each other ──
const companyA = id();
const companyB = id();

const agentA = { _id: id(), role: 'agent', companyId: companyA };
const agentB = { _id: id(), role: 'agent', companyId: companyB };
const unassignedAgent = { _id: id(), role: 'agent', companyId: null };
const superuser = { _id: id(), role: 'superuser', companyId: null };

const chatA = { _id: id(), customerId: 'visitor-a', companyId: companyA, status: 'open' };
const chatB = { _id: id(), customerId: 'visitor-b', companyId: companyB, status: 'open' };

const chats = Object.fromEntries([chatA, chatB].map(c => [String(c._id), c]));
const users = Object.fromEntries(
  [agentA, agentB, unassignedAgent, superuser].map(u => [String(u._id), u])
);

// Stub the two lookups authorizeChat makes. Patching the cached model objects
// means authorizeChat's own `require` picks these up unchanged.
Chat.findById = chatId => ({ lean: async () => chats[String(chatId)] || null });
User.findById = userId => ({ lean: async () => users[String(userId)] || null });

const authorizeChat = require('../src/socket/authorizeChat');

/** A socket as the handshake middleware would have left it. */
const customerSocket = (customerId, companyId) => ({ data: { customerId, companyId: String(companyId), role: 'customer' } });
const dashboardSocket = (user, claimedRole = 'agent') => ({ data: { userId: String(user._id), role: claimedRole } });

describe('customers', () => {
  test('may act on their own chat', async () => {
    const r = await authorizeChat(customerSocket('visitor-a', companyA), String(chatA._id));
    assert.equal(r.ok, true);
    assert.equal(r.role, 'customer');
    // senderId comes from the stored chat, never from the payload
    assert.equal(r.senderId, 'visitor-a');
  });

  test('may NOT act on another visitor\'s chat', async () => {
    const r = await authorizeChat(customerSocket('visitor-a', companyA), String(chatB._id));
    assert.equal(r.ok, false);
  });

  test('may NOT act on a chat at another company', async () => {
    // Same visitor id, wrong tenant: the companyId in the widget token must match too.
    const r = await authorizeChat(customerSocket('visitor-b', companyA), String(chatB._id));
    assert.equal(r.ok, false);
  });

  test('cannot become an agent by claiming a role', async () => {
    // The old guards were `if (socket.data.userId && ...)`, so a customer
    // socket sending senderRole:'agent' skipped the check entirely.
    const socket = customerSocket('visitor-a', companyA);
    socket.data.role = 'agent';
    const r = await authorizeChat(socket, String(chatA._id));
    assert.equal(r.ok, true);
    assert.equal(r.role, 'customer', 'role must come from socket.data.customerId, not the claim');
  });
});

describe('agents', () => {
  test('may act on a chat at their own company', async () => {
    const r = await authorizeChat(dashboardSocket(agentA), String(chatA._id));
    assert.equal(r.ok, true);
    assert.equal(r.role, 'agent');
    assert.equal(r.senderId, String(agentA._id));
  });

  test('may NOT act on a chat at another company', async () => {
    // The headline fix: this used to be allowed on every socket path.
    const r = await authorizeChat(dashboardSocket(agentB), String(chatA._id));
    assert.equal(r.ok, false);
  });

  test('may NOT act when they belong to no company', async () => {
    const r = await authorizeChat(dashboardSocket(unassignedAgent), String(chatA._id));
    assert.equal(r.ok, false);
  });

  test('cannot escalate to superuser by claiming it in the handshake', async () => {
    // socket.handshake.auth.role is whatever the client typed; authority must
    // come from the user record.
    const r = await authorizeChat(dashboardSocket(agentB, 'superuser'), String(chatA._id));
    assert.equal(r.ok, false);
  });
});

describe('superusers', () => {
  test('span tenants by design', async () => {
    for (const chat of [chatA, chatB]) {
      const r = await authorizeChat(dashboardSocket(superuser, 'superuser'), String(chat._id));
      assert.equal(r.ok, true);
      assert.equal(r.role, 'agent', 'superusers post as agents — the message enum has no superuser');
    }
  });
});

describe('rejects bad input', () => {
  test('socket with no identity at all', async () => {
    const r = await authorizeChat({ data: {} }, String(chatA._id));
    assert.equal(r.ok, false);
  });

  test('user deleted since the token was issued', async () => {
    const r = await authorizeChat(dashboardSocket({ _id: id() }), String(chatA._id));
    assert.equal(r.ok, false);
  });

  test('chat that does not exist', async () => {
    const r = await authorizeChat(dashboardSocket(agentA), String(id()));
    assert.equal(r.ok, false);
  });

  for (const [label, value] of [
    ['missing', undefined],
    ['not a string', 12345],
    ['malformed', 'not-an-objectid'],
  ]) {
    test(`chat id ${label}`, async () => {
      const r = await authorizeChat(dashboardSocket(agentA), value);
      assert.equal(r.ok, false);
    });
  }
});
