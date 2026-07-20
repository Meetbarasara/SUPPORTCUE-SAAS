const Chat = require('../models/Chat');
const User = require('../models/User');
const mongoose = require('mongoose');

const CustomerSession = require('../models/CustomerSession');
const Company = require('../models/Company');

// Create a new chat for a customer
const createChat = async (req, res) => {
  try {
    const { userId, companyId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    let resolvedCompanyId = companyId;

    if (!resolvedCompanyId) {
      const defaultCompany = await Company.findOne();
      if (!defaultCompany) {
        return res.status(404).json({ error: 'No company found to assign' });
      }
      resolvedCompanyId = defaultCompany._id;
    } else {
      if (!mongoose.Types.ObjectId.isValid(resolvedCompanyId)) {
        return res.status(400).json({ error: 'Invalid company ID' });
      }
    }

    // Ensure session exists
    await CustomerSession.findOrCreate(userId, resolvedCompanyId);

    // Create new chat
    const chat = new Chat({
      customerId: userId,
      companyId: resolvedCompanyId,
      mode: 'ai',
      status: 'open',
      messages: [{
        senderRole: 'ai',
        text: 'Hello! I\'m your AI support assistant. How can I help you today?',
        createdAt: new Date()
      }]
    });

    await chat.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`agents_${resolvedCompanyId}`).to('superusers').emit('chatUpdated', {
        chatId: chat._id
      });
    }

    res.status(201).json({
      message: 'Chat created successfully',
      chat,
      chatId: chat._id
    });

  } catch (error) {
    console.error('Create chat error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get chat by ID with messages
const getChat = async (req, res) => {
  try {
    const { chatId } = req.params;

    // Validation
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ error: 'Invalid chat ID' });
    }

    const chat = await Chat.findById(chatId)
      .populate('companyId', 'name slug')
      .populate('assignedAgentId', 'name email');

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Access control
    if (!req.user) {
      if (req.query.userId !== chat.customerId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (req.user.role === 'agent') {
      if (req.user.companyId && chat.companyId && req.user.companyId.toString() !== chat.companyId._id.toString()) {
        return res.status(403).json({ error: 'Access denied to this company' });
      }
    }

    // Get last 15 messages
    const lastMessages = chat.getLastMessages(15);

    const response = {
      chat: {
        _id: chat._id,
        customerId: chat.customerId,
        assignedAgentId: chat.assignedAgentId,
        mode: chat.mode,
        status: chat.status,
        lastInteraction: chat.lastInteraction,
        createdAt: chat.createdAt
      },
      messages: lastMessages
    };

    res.json(response);

  } catch (error) {
    console.error('Get chat error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Take over chat (switch from AI to human mode)
const takeOverChat = async (req, res) => {
  try {
    const { chatId, agentId } = req.body;

    // Validation
    if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ error: 'Valid chat ID is required' });
    }

    if (!agentId || !mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ error: 'Valid agent ID is required' });
    }

    // Check if chat exists
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

  // Check if agent exists and has proper role
  const agent = await User.findById(agentId);
  if (!agent || agent.role !== 'agent') {
      return res.status(403).json({ error: 'Invalid agent' });
    }

    // Take over the chat
    await chat.takeOver(agentId);

    // Add system message about takeover
    await chat.addMessage({
      senderRole: 'ai',
      text: `This conversation has been transferred to ${agent.name}, a human support agent. They will assist you shortly.`
    });

    res.json({
      message: 'Chat taken over successfully',
      chat: {
        _id: chat._id,
        mode: chat.mode,
        assignedAgentId: chat.assignedAgentId
      }
    });

  } catch (error) {
    console.error('Take over chat error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get active chats (for agent dashboard)
const getActiveChats = async (req, res) => {
  try {
    let query = { status: 'open' };
    
    // If user is an agent, strictly enforce company filtering
    if (req.user && req.user.role === 'agent') {
      if (!req.user.companyId) {
        return res.json({ chats: [], total: 0 });
      }
      query.companyId = req.user.companyId;
    }

    const chats = await Chat.find(query)
      .populate('assignedAgentId', 'name email')
      .populate('companyId', 'name slug')
      .sort({ lastInteraction: -1 })
      .limit(50);

    const formattedChats = chats.map(chat => ({
      _id: chat._id,
      customer: chat.customerId,
      assignedAgent: chat.assignedAgentId,
      mode: chat.mode,
      lastInteraction: chat.lastInteraction,
      messageCount: chat.messages.length,
      lastMessage: chat.messages[chat.messages.length - 1]?.text || 'No messages'
    }));

    res.json({
      chats: formattedChats,
      total: formattedChats.length
    });

  } catch (error) {
    console.error('Get active chats error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all chats for a specific company (open and closed) - Company authenticated endpoint
const getCompanyChats = async (req, res) => {
  try {
    const companyId = req.company._id;

    const chats = await Chat.find({ companyId })
      .populate('assignedAgentId', 'name email')
      .sort({ lastInteraction: -1 }); // Can add pagination if necessary

    const formattedChats = chats.map(chat => ({
      _id: chat._id,
      customer: chat.customerId,
      assignedAgent: chat.assignedAgentId,
      mode: chat.mode,
      status: chat.status,
      lastInteraction: chat.lastInteraction,
      messageCount: chat.messages.length,
      lastMessage: chat.messages[chat.messages.length - 1]?.text || 'No messages',
      messages: chat.messages
    }));

    res.json({
      chats: formattedChats,
      total: formattedChats.length
    });

  } catch (error) {
    console.error('Get company chats error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Close chat
const closeChat = async (req, res) => {
  try {
    const { chatId } = req.params;

    // Validation
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ error: 'Invalid chat ID' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    chat.status = 'closed';
    await chat.save();

    const io = req.app.get('io');
    if (io) {
      // Notify the customer
      io.to(chatId).emit('chatClosed');
      // Notify agents to refresh
      io.to(`agents_${chat.companyId}`).to('superusers').emit('chatUpdated', { chatId });
    }

    res.json({
      message: 'Chat closed successfully',
      chatId: chat._id
    });

  } catch (error) {
    console.error('Close chat error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get chats for a specific user (customer)
const getUserChats = async (req, res) => {
  try {
    const { userId, companyId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    let query = { customerId: userId };
    if (companyId) {
      query.companyId = companyId;
    }

    // Check if the requesting user is an agent trying to access chats
    if (req.user && req.user.role === 'agent') {
      if (!req.user.companyId) {
        return res.status(403).json({ error: 'Access denied. Unassigned agent.' });
      }
      
      if (companyId && companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({ error: 'Access denied to this company' });
      }
      
      // Force the query to only return chats from the agent's company
      query.companyId = req.user.companyId;
    }

    const chats = await Chat.find(query)
      .populate('assignedAgentId', 'name email')
      .sort({ lastInteraction: -1 })
      .limit(20);

    const formattedChats = chats.map(chat => ({
      _id: chat._id,
      mode: chat.mode,
      status: chat.status,
      assignedAgent: chat.assignedAgentId,
      lastInteraction: chat.lastInteraction,
      messageCount: chat.messages.length,
      lastMessage: chat.messages[chat.messages.length - 1]?.text || 'No messages'
    }));

    res.json({
      chats: formattedChats,
      total: formattedChats.length
    });

  } catch (error) {
    console.error('Get user chats error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createChat,
  getChat,
  getUserChats,
  getCompanyChats,
  takeOverChat,
  getActiveChats,
  closeChat
};
