const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const AgentInvite = require('../models/AgentInvite');
const User = require('../models/User');
const config = require('../config/env');
const emailService = require('../services/emailService');

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Store only the hash; the raw token exists solely in the invitation link. */
const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');

/**
 * POST /api/agents/invite   (company authenticated)
 * Invite one person to join this company as an agent.
 */
const inviteAgent = async (req, res) => {
  try {
    const companyId = req.company._id;
    const email = (req.body.email || '').toLowerCase().trim();

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }

    // An address already in use cannot be re-invited: accepting would either
    // fail on the unique index or, worse, need to move an existing agent
    // between companies.
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const token = crypto.randomBytes(32).toString('hex');

    // Re-inviting the same address replaces the previous invitation, which
    // also invalidates the older link.
    const invite = await AgentInvite.findOneAndUpdate(
      { companyId, email },
      {
        companyId,
        email,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        acceptedAt: null
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const invitationUrl = `${config.FRONTEND_URL}/agent-setup?token=${token}`;

    console.log(`\n=============================================`);
    console.log(`AGENT INVITATION FOR: ${email}`);
    console.log(`Company: ${req.company.name}`);
    console.log(invitationUrl);
    console.log(`=============================================\n`);

    emailService
      .sendAgentInvitation(email, req.company.name, invitationUrl)
      .catch(err => console.error('[AgentInvite] Failed to send email:', err.message));

    // The link is returned here as well, because email is optional: SMTP may
    // not be configured, and without it the invitee would be unreachable.
    res.status(201).json({
      message: 'Invitation created',
      invite: { _id: invite._id, email: invite.email, expiresAt: invite.expiresAt },
      invitationUrl
    });
  } catch (error) {
    console.error('Invite agent error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/agents   (company authenticated)
 * The company's agents plus its outstanding invitations.
 */
const listAgents = async (req, res) => {
  try {
    const companyId = req.company._id;

    const [agents, invites] = await Promise.all([
      User.find({ companyId, role: 'agent' }, 'name email createdAt').sort({ createdAt: -1 }).lean(),
      AgentInvite.find({ companyId, acceptedAt: null }, 'email expiresAt createdAt')
        .sort({ createdAt: -1 })
        .lean()
    ]);

    const now = Date.now();
    res.json({
      agents,
      invites: invites.map(i => ({ ...i, expired: new Date(i.expiresAt).getTime() < now }))
    });
  } catch (error) {
    console.error('List agents error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * DELETE /api/agents/invite/:id   (company authenticated)
 * Revoke an outstanding invitation.
 */
const revokeInvite = async (req, res) => {
  try {
    // Scoped to the authenticated company, so an id from another tenant is a
    // 404 rather than a 403 — it does not confirm the invitation exists.
    const invite = await AgentInvite.findOneAndDelete({
      _id: req.params.id,
      companyId: req.company._id
    });

    if (!invite) return res.status(404).json({ error: 'Invitation not found' });
    res.json({ message: 'Invitation revoked' });
  } catch (error) {
    console.error('Revoke invite error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/** Find a live invitation for a raw token, or null. */
const findLiveInvite = async token => {
  if (!token || typeof token !== 'string') return null;
  return AgentInvite.findOne({
    tokenHash: hashToken(token),
    acceptedAt: null,
    expiresAt: { $gt: new Date() }
  }).populate('companyId', 'name');
};

/**
 * GET /api/auth/agent/verify-invite?token=...   (public)
 * Lets the setup page show who the invitation is for before asking for a password.
 */
const verifyAgentInvite = async (req, res) => {
  try {
    const invite = await findLiveInvite(req.query.token);
    if (!invite) {
      return res.status(400).json({ error: 'This invitation is invalid, expired, or already used' });
    }
    res.json({ email: invite.email, companyName: invite.companyId?.name || 'your team' });
  } catch (error) {
    console.error('Verify agent invite error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/auth/agent/accept-invite   (public)
 * Creates the agent account. companyId comes from the invitation, never from
 * the request body — that substitution is the whole point of this flow.
 */
const acceptAgentInvite = async (req, res) => {
  try {
    const { token, name, password } = req.body;

    if (!token || !name || !password) {
      return res.status(400).json({ error: 'Token, name, and password are required' });
    }
    if (!name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const invite = await findLiveInvite(token);
    if (!invite) {
      return res.status(400).json({ error: 'This invitation is invalid, expired, or already used' });
    }

    if (await User.findOne({ email: invite.email })) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const user = new User({
      name: name.trim(),
      email: invite.email,          // fixed by the invitation, not chosen here
      password,                     // virtual setter hashes it
      role: 'agent',                // an invitation can only ever create an agent
      companyId: invite.companyId._id || invite.companyId
    });
    await user.save();

    // Single-use.
    invite.acceptedAt = new Date();
    await invite.save();

    const authToken = jwt.sign({ userId: user._id }, config.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Account created successfully',
      user: user.toPublicJSON(),
      token: authToken
    });
  } catch (error) {
    console.error('Accept agent invite error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  inviteAgent,
  listAgents,
  revokeInvite,
  verifyAgentInvite,
  acceptAgentInvite
};
