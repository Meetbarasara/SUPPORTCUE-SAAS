const config = require('../config/env');
const fetch = require('node-fetch');

const EMBEDDING_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent';

class EmbeddingService {
  constructor() {
    this.apiKey = config.GEMINI_API_KEY;
    this.callDelayMs = 120; // ~8 calls/sec to stay within free tier limits
  }

  /**
   * Generate a single embedding vector for a text string.
   * Returns a 768-dimensional number array.
   */
  async generateEmbedding(text) {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not set. Cannot generate embeddings.');
    }

    const response = await fetch(`${EMBEDDING_URL}?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-2',
        content: {
          parts: [{ text }]
        },
        outputDimensionality: 768
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Embedding API error (${response.status}): ${errText}`);
    }

    const data = await response.json();

    if (!data.embedding || !data.embedding.values) {
      throw new Error('Invalid embedding response from Gemini');
    }

    return data.embedding.values; // 768-dim float array
  }

  /**
   * Generate embeddings for an array of texts.
   * Adds a small delay between calls to respect rate limits.
   */
  async generateBatchEmbeddings(texts) {
    const embeddings = [];
    for (let i = 0; i < texts.length; i++) {
      const embedding = await this.generateEmbedding(texts[i]);
      embeddings.push(embedding);

      // Progress logging
      if ((i + 1) % 10 === 0) {
        console.log(`Embedded ${i + 1}/${texts.length} chunks...`);
      }

      // Delay between calls (skip delay on last item)
      if (i < texts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, this.callDelayMs));
      }
    }
    return embeddings;
  }

  /**
   * Compute cosine similarity between two vectors.
   * Used as a local fallback when Atlas vector search is unavailable.
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }
}

module.exports = new EmbeddingService();
