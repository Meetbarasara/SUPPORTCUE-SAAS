const Company = require('../models/Company');
const User = require('../models/User');
const Document = require('../models/Document');
const DocumentChunk = require('../models/DocumentChunk');
const mongoose = require('mongoose');
const crypto = require('crypto');
const config = require('../config/env');
const emailService = require('../services/emailService');

// Create a new company (superuser only)
const createCompany = async (req, res) => {
  try {
    const { name, email, systemPrompt } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Company email is required' });
    }

    // Check if email is already in use
    const existingCompany = await Company.findOne({ email: email.toLowerCase().trim() });
    if (existingCompany) {
      return res.status(400).json({ error: 'Company with this email already exists' });
    }

    // Generate slug from name
    const baseSlug = Company.generateSlug(name);

    // Ensure slug is unique
    let slug = baseSlug;
    let counter = 1;
    while (await Company.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Generate Invitation Token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const company = new Company({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      slug,
      systemPrompt: systemPrompt?.trim() || undefined,
      invitationToken,
      invitationExpires
    });

    await company.save();

    const frontendUrl = config.FRONTEND_URL || 'http://localhost:3000';
    const invitationUrl = `${frontendUrl}/company-setup?token=${invitationToken}`;
    
    // Always log to console for easy local testing
    console.log(`\n=============================================`);
    console.log(`📧 INVITATION EMAIL TO: ${company.email}`);
    console.log(`Your company account has been created.`);
    console.log(`Please set your password by visiting:`);
    console.log(invitationUrl);
    console.log(`=============================================\n`);

    // Send the actual email asynchronously
    emailService.sendCompanyInvitation(company.email, company.name, invitationUrl)
      .catch(err => console.error('[CompanyController] Failed to send email:', err));

    res.status(201).json({
      message: 'Company created successfully. Invitation sent.',
      company: company.toPublicJSON(),
      invitationUrl // Returned for easy dev access
    });
  } catch (error) {
    console.error('Create company error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// List all companies (superuser only)
const listCompanies = async (req, res) => {
  try {
    const companies = await Company.find()
      .sort({ createdAt: -1 });

    // Attach document counts per company
    const companiesWithStats = await Promise.all(
      companies.map(async (company) => {
        const docCount = await Document.countDocuments({ companyId: company._id });
        const chunkCount = await DocumentChunk.countDocuments({ companyId: company._id });
        return {
          ...company.toObject(),
          stats: { documents: docCount, chunks: chunkCount }
        };
      })
    );

    res.json({ companies: companiesWithStats, total: companiesWithStats.length });
  } catch (error) {
    console.error('List companies error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a single company by ID with its documents (superuser only)
const getCompany = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid company ID' });
    }

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const documents = await Document.find({ companyId: id }).sort({ createdAt: -1 });

    res.json({ company, documents });
  } catch (error) {
    console.error('Get company error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update company name / system prompt (superuser only)
const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, systemPrompt, settings } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid company ID' });
    }

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (name) company.name = name.trim();
    if (systemPrompt !== undefined) company.systemPrompt = systemPrompt.trim();
    if (settings?.maxDocuments) company.settings.maxDocuments = settings.maxDocuments;
    if (settings?.maxFileSizeMB) company.settings.maxFileSizeMB = settings.maxFileSizeMB;

    await company.save();

    res.json({ message: 'Company updated successfully', company });
  } catch (error) {
    console.error('Update company error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a company and all its associated data (superuser only)
const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid company ID' });
    }

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Delete all chunks, documents, then the company
    await DocumentChunk.deleteMany({ companyId: id });
    await Document.deleteMany({ companyId: id });

    // Delete all agents associated with this company
    await User.deleteMany({ companyId: id });

    await Company.findByIdAndDelete(id);

    res.json({ message: 'Company and all associated data deleted successfully' });
  } catch (error) {
    console.error('Delete company error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Assign a user to a company (superuser only)
const assignUserToCompany = async (req, res) => {
  try {
    const { userId, companyId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ error: 'Invalid user or company ID' });
    }

    const [user, company] = await Promise.all([
      User.findById(userId),
      Company.findById(companyId)
    ]);

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!company) return res.status(404).json({ error: 'Company not found' });

    user.companyId = companyId;
    await user.save();

    res.json({ message: 'User assigned to company successfully', user: user.toPublicJSON() });
  } catch (error) {
    console.error('Assign user to company error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createCompany,
  listCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
  assignUserToCompany
};
