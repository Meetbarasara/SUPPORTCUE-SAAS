const config = require('../config/env');
const fetch = require('node-fetch');

const EMBEDDING_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent';

const sleep = ms => new Promise(r => setTimeout(r, ms));

class EmbeddingService {
  constructor() {
    this.apiKey = config.GEMINI_API_KEY;
    // Free-tier embedding quotas are low. Tune without a redeploy via env.
    this.callDelayMs = Number(process.env.EMBEDDING_DELAY_MS) || 350;
    this.maxRetries = Number(process.env.EMBEDDING_MAX_RETRIES) || 5;
  }

  /**
   * Generate a single embedding vector for a text string.
   * Retries on 429 (quota) and 5xx with exponential backoff, so a transient
   * rate limit does not fail the whole document.
   * Returns a 768-dimensional number array.
   */
  async generateEmbedding(text) {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not set. Cannot generate embeddings.');
    }

    let lastErr;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
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

      if (response.ok) {
        const data = await response.json();
        if (!data.embedding || !data.embedding.values) {
          throw new Error('Invalid embedding response from Gemini');
        }
        return data.embedding.values; // 768-dim float array
      }

      const errText = await response.text();
      lastErr = new Error(`Embedding API error (${response.status}): ${errText}`);

      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === this.maxRetries) throw lastErr;

      // Honour Retry-After when the API supplies it, else exponential backoff.
      const retryAfter = Number(response.headers.get('retry-after'));
      const backoff = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Math.min(2 ** attempt * 1000, 32000) + Math.floor(Math.random() * 500);

      console.warn(`[Embedding] HTTP ${response.status}; retry ${attempt + 1}/${this.maxRetries} in ${Math.round(backoff / 1000)}s`);
      await sleep(backoff);
    }

    throw lastErr;
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
