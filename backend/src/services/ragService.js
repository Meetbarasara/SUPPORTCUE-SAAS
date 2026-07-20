const fs = require('fs');
const DocumentChunk = require('../models/DocumentChunk');
const Document = require('../models/Document');
const embeddingService = require('./embeddingService');
const { extractTextFromPDF, chunkText } = require('./pdfService');

class RagService {
  /**
   * Full processing pipeline for an uploaded PDF document.
   * 1. Extract text from PDF
   * 2. Split into overlapping chunks
   * 3. Generate embeddings for each chunk via Gemini
   * 4. Store all chunks in MongoDB
   *
   * @param {string} documentId - MongoDB ObjectId of the Document record
   * @param {string} filePath   - Absolute path to the uploaded PDF file
   */
  async processDocument(documentId, filePath) {
    const doc = await Document.findById(documentId);
    if (!doc) throw new Error(`Document ${documentId} not found`);

    try {
      console.log(`[RAG] Processing document: ${doc.originalName}`);

      // Step 1: Extract text
      const rawText = await extractTextFromPDF(filePath);
      if (!rawText || rawText.trim().length === 0) {
        throw new Error('PDF appears to be empty or has no extractable text (may be image-based)');
      }
      console.log(`[RAG] Extracted ${rawText.length} characters from PDF`);

      // Step 2: Chunk the text
      const chunks = chunkText(rawText);
      if (chunks.length === 0) {
        throw new Error('No valid text chunks could be generated from this PDF');
      }
      console.log(`[RAG] Created ${chunks.length} chunks — processing in batches...`);

      // Step 3: Delete any existing chunks for this document (re-processing support)
      await DocumentChunk.deleteMany({ documentId });

      // Step 4: Stream chunks in small batches — embed + save + free memory per batch
      // This keeps memory usage constant regardless of PDF size
      const BATCH_SIZE = 10;
      let totalSaved = 0;

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batchChunks = chunks.slice(i, i + BATCH_SIZE);
        const batchStart = i;

        // Embed this batch
        const batchEmbeddings = await embeddingService.generateBatchEmbeddings(batchChunks);

        // Build Mongoose docs for this batch only
        const batchDocs = batchChunks.map((text, j) => ({
          documentId: doc._id,
          companyId: doc.companyId,
          chunkIndex: batchStart + j,
          text,
          embedding: batchEmbeddings[j],
          metadata: { page: null }
        }));

        // Save batch immediately, then let it be garbage collected
        await DocumentChunk.insertMany(batchDocs, { ordered: false });
        totalSaved += batchDocs.length;

        console.log(`[RAG] Saved batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} (${totalSaved}/${chunks.length} chunks)`);

        // Explicitly null out batch data to help GC
        batchDocs.length = 0;
        batchEmbeddings.length = 0;
      }

      // Step 5: Update document status to ready
      doc.totalChunks = chunks.length;
      doc.status = 'ready';
      doc.errorMessage = null;
      await doc.save();

      // Clean up uploaded file after processing
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[RAG] Cleaned up file: ${filePath}`);
      }

      console.log(`[RAG] ✅ Document "${doc.originalName}" processed successfully (${chunks.length} chunks)`);
    } catch (error) {
      console.error(`[RAG] Document processing failed: ${error.message}`);

      // Mark document as errored
      doc.status = 'error';
      doc.errorMessage = error.message;
      await doc.save();

      // Clean up file even on error
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      throw error;
    }
  }


  /**
   * Search for the most relevant chunks for a query using MongoDB Atlas Vector Search.
   * Falls back to in-memory cosine similarity if Atlas vector search is unavailable.
   *
   * @param {string} companyId  - Filter results to this company only
   * @param {string} queryText  - The customer's question
   * @param {number} topK       - Number of chunks to return
   * @returns {Array} Top-k most relevant DocumentChunk objects
   */
  async searchRelevantChunks(companyId, queryText, topK = 5) {
    try {
      const mongoose = require('mongoose');
      const companyObjectId = typeof companyId === 'string' ? new mongoose.Types.ObjectId(companyId) : companyId;

      // Generate embedding for the query
      const queryEmbedding = await embeddingService.generateEmbedding(queryText);

      // Try Atlas Vector Search first
      try {
        const results = await DocumentChunk.aggregate([
          {
            $vectorSearch: {
              index: 'vector_index',
              path: 'embedding',
              queryVector: queryEmbedding,
              numCandidates: topK * 10,
              limit: topK,
              filter: { companyId: { $eq: companyObjectId } }
            }
          },
          {
            $project: {
              text: 1,
              chunkIndex: 1,
              documentId: 1,
              score: { $meta: 'vectorSearchScore' }
            }
          }
        ]);

        if (results.length > 0) {
          console.log(`[RAG] Atlas vector search returned ${results.length} chunks`);
          return results;
        }
      } catch (atlasError) {
        // Atlas vector search not available — fall back to in-memory cosine similarity
        console.warn(`[RAG] Atlas vector search unavailable (${atlasError.message}), using cosine similarity fallback`);
      }

      // Fallback: load chunks for the company and compute cosine similarity in-app.
      // ⚠ CAP at 500 chunks to prevent memory exhaustion under concurrent load.
      // For production, configure MongoDB Atlas Vector Search instead.
      const FALLBACK_CHUNK_LIMIT = 500;
      if (process.env.NODE_ENV === 'production') {
        console.warn(`[RAG] ⚠ Using in-memory cosine similarity fallback in PRODUCTION. Consider enabling Atlas Vector Search for better performance and scalability.`);
      }

      const allChunks = await DocumentChunk.find(
        { companyId },
        { text: 1, chunkIndex: 1, documentId: 1, embedding: 1 }
      ).limit(FALLBACK_CHUNK_LIMIT);

      if (allChunks.length === 0) return [];

      const scored = allChunks.map(chunk => ({
        _id: chunk._id,
        text: chunk.text,
        chunkIndex: chunk.chunkIndex,
        documentId: chunk.documentId,
        score: embeddingService.cosineSimilarity(queryEmbedding, chunk.embedding)
      }));

      scored.sort((a, b) => b.score - a.score);
      const top = scored.slice(0, topK);
      console.log(`[RAG] Cosine similarity fallback returned ${top.length} chunks (top score: ${top[0]?.score?.toFixed(3)})`);
      return top;

    } catch (error) {
      console.error(`[RAG] searchRelevantChunks failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Build the RAG context string to inject into the Gemini prompt.
   * Returns null if no relevant context is found.
   *
   * @param {string} companyId   - The company whose KB to search
   * @param {string} userMessage - The customer's question
   * @returns {string|null}      - Formatted context string, or null
   */
  async buildRAGContext(companyId, userMessage) {
    try {
      const chunks = await this.searchRelevantChunks(companyId, userMessage, 5);

      if (!chunks || chunks.length === 0) {
        return null;
      }

      // Filter out chunks with very low relevance (score < 0.5)
      const relevantChunks = chunks.filter(c => !c.score || c.score > 0.45);
      if (relevantChunks.length === 0) return null;

      const contextParts = relevantChunks.map((chunk, i) => `[${i + 1}] ${chunk.text}`);
      const context = `The following information is from the company's official documents. Use it to answer the customer's question accurately:\n\n${contextParts.join('\n\n')}`;

      return context;
    } catch (error) {
      console.error(`[RAG] buildRAGContext failed: ${error.message}`);
      return null;
    }
  }
}

module.exports = new RagService();
