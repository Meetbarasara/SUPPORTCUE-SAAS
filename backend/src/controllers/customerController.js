const CustomerSession = require('../models/CustomerSession');
const Company = require('../models/Company');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Issue a short-lived widget session token for a customer.
 * This token is used to authenticate the customer's Socket.IO connection.
 */
const issueWidgetToken = (customerId, companyId) => {
  return jwt.sign(
    { customerId, companyId: companyId.toString(), type: 'widget' },
    config.WIDGET_SECRET,
    { expiresIn: '24h' }
  );
};

// Initialize a customer session
const initCustomer = async (req, res) => {
  try {
    const { userId, companyId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    let resolvedCompanyId = companyId;

    // If companyId is not provided, pick the first active company
    if (!resolvedCompanyId) {
      const defaultCompany = await Company.findOne();
      if (!defaultCompany) {
        return res.status(404).json({ error: 'No company found to assign' });
      }
      resolvedCompanyId = defaultCompany._id;
    } else {
      // Validate companyId
      if (!mongoose.Types.ObjectId.isValid(resolvedCompanyId)) {
        return res.status(400).json({ error: 'Invalid company ID' });
      }
      const company = await Company.findById(resolvedCompanyId);
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }
    }

    // Find or create customer session
    const session = await CustomerSession.findOrCreate(userId, resolvedCompanyId);

    // Issue a signed widget token for Socket.IO auth
    const widgetToken = issueWidgetToken(userId, resolvedCompanyId);

    res.json({
      message: 'Customer session initialized',
      userId: session.userId,
      companyId: session.companyId,
      sessionId: session._id,
      widgetToken  // Frontend uses this to authenticate the socket connection
    });

  } catch (error) {
    console.error('Init customer error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Set or change company for a customer session (Agent/Superuser only)
const setCompany = async (req, res) => {
  try {
    const { userId, companyId } = req.body;

    if (!userId || !companyId) {
      return res.status(400).json({ error: 'User ID and Company ID are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ error: 'Invalid company ID' });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Since a user can have multiple sessions across different companies,
    // "setting" a company means initializing a session for that company.
    // The chat widget will use this new companyId for future chats.
    const session = await CustomerSession.findOrCreate(userId, companyId);

    res.json({
      message: 'Company set for customer successfully',
      userId: session.userId,
      companyId: session.companyId,
      sessionId: session._id
    });

  } catch (error) {
    console.error('Set company error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  initCustomer,
  setCompany
};
