/**
 * Agent invitations decide company membership.
 *
 *   npm test
 *
 * Agents used to self-register against any companyId in the request body, and
 * that id is printed in the widget embed snippet on every customer's public
 * site. The rule that replaced it is: the invitation says which company you
 * join, and nothing in the request can change it. That rule is what these
 * tests pin down.
 *
 * Model lookups and User.save are stubbed, so there is no database involved.
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const mongoose = require('mongoose');

const AgentInvite = require('../src/models/AgentInvite');
const User = require('../src/models/User');

const invitedCompany = new mongoose.Types.ObjectId();
const otherCompany = new mongoose.Types.ObjectId();

const RAW_TOKEN = 'a'.repeat(64);
const hashOf = t => crypto.createHash('sha256').update(t).digest('hex');

let liveInvite;   // the invitation the stubbed lookup will find
let existingUser; // what User.findOne should return
let savedUser;    // whatever the controller tried to persist

beforeEach(() => {
  savedUser = null;
  existingUser = null;
  liveInvite = {
    _id: new mongoose.Types.ObjectId(),
    email: 'invited@acme.test',
    companyId: { _id: invitedCompany, name: 'Acme' },
    acceptedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    save: async function () { return this; }
  };
});

// findLiveInvite() matches on the hash of the supplied token, never the token.
AgentInvite.findOne = query => ({
  populate: async () => (liveInvite && query.tokenHash === hashOf(RAW_TOKEN) ? liveInvite : null)
});
User.findOne = async () => existingUser;
User.prototype.save = async function () { savedUser = this; return this; };

const { acceptAgentInvite } = require('../src/controllers/agentInviteController');

/** Minimal Express-style response recorder. */
function mockRes() {
  return {
    code: 200,
    body: null,
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; }
  };
}

const accept = async body => {
  const res = mockRes();
  await acceptAgentInvite({ body }, res);
  return res;
};

describe('accepting an invitation', () => {
  test('creates an agent at the inviting company', async () => {
    const res = await accept({ token: RAW_TOKEN, name: 'Aya', password: 'a-good-password' });
    assert.equal(res.code, 201);
    assert.equal(String(savedUser.companyId), String(invitedCompany));
    assert.equal(savedUser.role, 'agent');
    assert.equal(savedUser.email, 'invited@acme.test');
    assert.ok(res.body.token, 'signs the new agent in');
  });

  test('hashes the password rather than storing it', async () => {
    await accept({ token: RAW_TOKEN, name: 'Aya', password: 'a-good-password' });
    assert.ok(savedUser.passwordHash, 'a hash is stored');
    assert.notEqual(savedUser.passwordHash, 'a-good-password');
    assert.equal(savedUser.password, undefined, 'the plain password is not a real field');
    assert.equal(res_public(savedUser).passwordHash, undefined, 'and never leaves in JSON');
  });

  test('marks the invitation used, so it cannot be replayed', async () => {
    await accept({ token: RAW_TOKEN, name: 'Aya', password: 'a-good-password' });
    assert.ok(liveInvite.acceptedAt instanceof Date);
  });
});

describe('ignores everything the request tries to decide', () => {
  test('a companyId in the body does not move the account', async () => {
    await accept({
      token: RAW_TOKEN, name: 'Mallory', password: 'a-good-password',
      companyId: String(otherCompany)
    });
    assert.equal(String(savedUser.companyId), String(invitedCompany),
      'company must come from the invitation');
  });

  test('a role in the body cannot escalate', async () => {
    await accept({
      token: RAW_TOKEN, name: 'Mallory', password: 'a-good-password',
      role: 'superuser'
    });
    assert.equal(savedUser.role, 'agent');
  });

  test('an email in the body cannot redirect the invitation', async () => {
    await accept({
      token: RAW_TOKEN, name: 'Mallory', password: 'a-good-password',
      email: 'mallory@evil.test'
    });
    assert.equal(savedUser.email, 'invited@acme.test');
  });
});

describe('refuses bad requests', () => {
  test('a token that matches no live invitation', async () => {
    const res = await accept({ token: 'b'.repeat(64), name: 'Aya', password: 'a-good-password' });
    assert.equal(res.code, 400);
    assert.equal(savedUser, null);
  });

  test('an expired or already-used invitation', async () => {
    liveInvite = null; // findLiveInvite filters on acceptedAt and expiresAt
    const res = await accept({ token: RAW_TOKEN, name: 'Aya', password: 'a-good-password' });
    assert.equal(res.code, 400);
    assert.equal(savedUser, null);
  });

  test('an email that already has an account', async () => {
    existingUser = { _id: new mongoose.Types.ObjectId() };
    const res = await accept({ token: RAW_TOKEN, name: 'Aya', password: 'a-good-password' });
    assert.equal(res.code, 400);
    assert.equal(savedUser, null);
  });

  test('a password under 8 characters', async () => {
    const res = await accept({ token: RAW_TOKEN, name: 'Aya', password: 'short' });
    assert.equal(res.code, 400);
    assert.equal(savedUser, null);
  });

  for (const [label, body] of [
    ['no token', { name: 'Aya', password: 'a-good-password' }],
    ['no name', { token: RAW_TOKEN, password: 'a-good-password' }],
    ['blank name', { token: RAW_TOKEN, name: '   ', password: 'a-good-password' }],
    ['no password', { token: RAW_TOKEN, name: 'Aya' }],
  ]) {
    test(label, async () => {
      const res = await accept(body);
      assert.equal(res.code, 400);
      assert.equal(savedUser, null);
    });
  }
});

function res_public(user) {
  return user.toPublicJSON();
}
