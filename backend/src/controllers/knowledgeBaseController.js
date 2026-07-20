const path = require('path');
const Document = require('../models/Document');
const DocumentChunk = require('../models/DocumentChunk');
const Company = require('../models/Company');
const ragService = require('../services/ragService');
const mongoose = require('mongoose');

// Upload a PDF for a specific company
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please attach a PDF.' });
    }

    const companyId = req.company._id;
    const company = req.company;

    // Check document limit
    const existingCount = await Document.countDocuments({ companyId, status: { $ne: 'error' } });
    if (existingCount >= company.settings.maxDocuments) {
      return res.status(400).json({
        error: `Document limit reached. Maximum ${company.settings.maxDocuments} documents allowed per company.`
      });
    }

    // Create document record immediately (status: processing)
    const doc = new Document({
      companyId,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      status: 'processing'
    });
    await doc.save();

    // Start async processing (non-blocking)
    const filePath = req.file.path;
    setImmediate(async () => {
      try {
        await ragService.processDocument(doc._id, filePath);
      } catch (error) {
        console.error(`[KB] Background processing failed for doc ${doc._id}:`, error.message);
      }
    });

    res.status(201).json({
      message: 'Document uploaded successfully. Processing has started.',
      document: {
        _id: doc._id,
        originalName: doc.originalName,
        fileSize: doc.fileSize,
        status: doc.status,
        companyId: doc.companyId
      }
    });
  } catch (error) {
    console.error('Upload document error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// List all documents for the authenticated company
const listDocuments = async (req, res) => {
  try {
    const companyId = req.company._id;

    const documents = await Document.find({ companyId })
      .sort({ createdAt: -1 });

    res.json({ documents, total: documents.length });
  } catch (error) {
    console.error('List documents error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get document details including chunk count
const getDocument = async (req, res) => {
  try {
    const { docId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(docId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const doc = await Document.findOne({ _id: docId, companyId: req.company._id });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found or access denied' });
    }

    const chunkCount = await DocumentChunk.countDocuments({ documentId: docId });

    res.json({ document: doc, chunkCount });
  } catch (error) {
    console.error('Get document error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a document and all its chunks
const deleteDocument = async (req, res) => {
  try {
    const { docId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(docId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const doc = await Document.findOne({ _id: docId, companyId: req.company._id });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found or access denied' });
    }

    // Delete all associated chunks first, then the document
    const chunksDeleted = await DocumentChunk.deleteMany({ documentId: docId });
    await Document.findByIdAndDelete(docId);

    res.json({
      message: 'Document and all its chunks deleted successfully',
      chunksRemoved: chunksDeleted.deletedCount
    });
  } catch (error) {
    console.error('Delete document error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Test search endpoint — useful for debugging RAG quality
const testSearch = async (req, res) => {
  try {
    const { q } = req.query;
    const companyId = req.company._id;

    if (!q) {
      return res.status(400).json({ error: 'q (query) is required' });
    }

    const chunks = await ragService.searchRelevantChunks(companyId, q, 5);

    res.json({
      query: q,
      results: chunks.map(c => ({
        text: c.text,
        score: c.score,
        chunkIndex: c.chunkIndex,
        documentId: c.documentId
      }))
    });
  } catch (error) {
    console.error('Test search error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  uploadDocument,
  listDocuments,
  getDocument,
  deleteDocument,
  testSearch
};
