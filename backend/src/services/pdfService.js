const fs = require('fs');
const path = require('path');

/**
 * Extract plain text from a PDF file using pdf-parse.
 * Returns the full text content as a string.
 */
async function extractTextFromPDF(filePath) {
  const pdfParse = require('pdf-parse');
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text || '';
}

/**
 * Split text into overlapping chunks.
 * @param {string} text      - Raw text to split
 * @param {number} chunkSize - Target tokens per chunk (approx. 4 chars ≈ 1 token)
 * @param {number} overlap   - Overlap tokens between consecutive chunks
 * @returns {string[]} Array of text chunks
 */
function chunkText(text, chunkSize = 500, overlap = 50) {
  if (!text || text.trim().length === 0) return [];

  // Normalize whitespace
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  // Approximate chars per token
  const charsPerToken = 4;
  const chunkChars = chunkSize * charsPerToken;   // 2000 chars
  const overlapChars = overlap * charsPerToken;   // 200 chars

  const chunks = [];
  let start = 0;

  while (start < normalized.length) {
    const end = Math.min(start + chunkChars, normalized.length);
    let chunk = normalized.slice(start, end);

    // Try to end at a sentence boundary if not at the document end
    if (end < normalized.length) {
      const lastPeriod = chunk.lastIndexOf('. ');
      const lastNewline = chunk.lastIndexOf('\n');
      const boundary = Math.max(lastPeriod, lastNewline);
      if (boundary > chunkChars * 0.5) {
        // Snap to the boundary for cleaner chunks
        chunk = normalized.slice(start, start + boundary + 1);
      }
    }

    const trimmed = chunk.trim();
    if (trimmed.length > 50) { // ignore tiny fragments
      chunks.push(trimmed);
    }

    if (end >= normalized.length) {
      break; // Reached the end of the document
    }

    // Move forward with overlap
    const advance = chunk.length - overlapChars;
    if (advance <= 0) {
      break; // Fallback to prevent infinite loop
    }
    start += advance;
  }

  return chunks;
}

module.exports = { extractTextFromPDF, chunkText };
