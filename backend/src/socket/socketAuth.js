const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Socket.IO Authentication Middleware (Two-tier)
 *
 * Customer (widget) connections:
 *   - Pass { token: <widgetSessionToken>, role: 'customer' } in socket.auth
 *   - The widgetSessionToken is issued by POST /api/customer/init
 *
 * Agent/Superuser (dashboard) connections:
 *   - Pass { token: <jwtToken>, role: 'agent'|'superuser' } in socket.auth
 *   - The jwtToken is the standard JWT from POST /api/auth/login
 *
 * Unauthenticated connections are rejected.
 */
const socketAuthMiddleware = (socket, next) => {
  try {
    const { token, role } = socket.handshake.auth || {};

    if (!token) {
      return next(new Error('Socket authentication error: no token provided'));
    }

    if (role === 'customer') {
      // ── Customer: verify widget session token ──
      const decoded = jwt.verify(token, config.WIDGET_SECRET);
      if (!decoded.customerId || decoded.type !== 'widget') {
        return next(new Error('Socket authentication error: invalid widget token'));
      }
      socket.data.customerId = decoded.customerId;
      socket.data.companyId  = decoded.companyId;
      socket.data.role       = 'customer';
      return next();
    }

    // ── Agent / Superuser: verify JWT ──
    const decoded = jwt.verify(token, config.JWT_SECRET);
    if (!decoded.userId) {
      return next(new Error('Socket authentication error: invalid agent token'));
    }
    socket.data.userId = decoded.userId;
    socket.data.role   = role || 'agent';
    return next();

  } catch (err) {
    console.error('[Socket] Auth middleware error:', err.message);
    next(new Error('Socket authentication error: ' + err.message));
  }
};

module.exports = socketAuthMiddleware;
