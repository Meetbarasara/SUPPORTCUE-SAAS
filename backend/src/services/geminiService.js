const config = require('../config/env');
const fetch = require('node-fetch');

const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI customer support agent. Be concise, polite, and professional. Confirm understanding and ask clarifying questions if needed.

CRITICAL INSTRUCTION:
If the user explicitly asks to speak to a human, a real person, an agent, or a manager, OR if the user expresses extreme frustration, you must output a JSON object with handoff_requested set to true.

Format your response strictly as JSON:
{
  "answer": "Your text response to the user here. Leave blank if handing off.",
  "handoff_requested": true or false
}`;

class GeminiService {
  constructor() {
    this.apiKey = config.GEMINI_API_KEY;
    this.baseUrl = config.GEMINI_BASE_URL;
    this.rateLimitMap = new Map(); // Track last call per chat
    this.cooldownMs = 300;
  }

  // Check if we can make a call (rate limiting)
  canMakeCall(chatId) {
    const lastCall = this.rateLimitMap.get(chatId);
    if (!lastCall) return true;
    const timeSinceLastCall = Date.now() - lastCall;
    return timeSinceLastCall >= this.cooldownMs;
  }

  /**
   * Build the contents array for Gemini API.
   * When ragContext is provided, it is injected into the system turn.
   *
   * @param {Array}       messages            - Chat message history
   * @param {string|null} ragContext          - Retrieved document context (optional)
   * @param {string|null} companySystemPrompt - Company-specific AI persona prompt (optional)
   */
  buildContentsArray(messages) {
    const contents = [];

    // Add conversation history (last 15 messages)
    const recentMessages = messages.slice(-15);
    recentMessages.forEach(msg => {
      const role = msg.senderRole === 'ai' ? 'model' : 'user';
      contents.push({
        role,
        parts: [{ text: msg.text }]
      });
    });

    // Ensure we don't send back-to-back same roles
    const validContents = [];
    let lastRole = null;
    
    for (const msg of contents) {
      if (msg.role !== lastRole) {
        validContents.push(msg);
        lastRole = msg.role;
      } else {
        // Merge consecutive messages from same role
        validContents[validContents.length - 1].parts[0].text += '\n\n' + msg.parts[0].text;
      }
    }

    // Gemini API STRICTLY requires that the conversation starts with a 'user' turn.
    // If our history starts with an AI greeting ('model'), we must prepend a dummy user turn.
    if (validContents.length > 0 && validContents[0].role === 'model') {
      validContents.unshift({
        role: 'user',
        parts: [{ text: '[Customer joined the chat]' }]
      });
    }

    return validContents;
  }

  /**
   * Get an AI reply from Gemini, optionally grounded in RAG context.
   *
   * @param {string}      chatId              - Chat room ID (used for rate limiting)
   * @param {Array}       messages            - Full chat history
   * @param {string|null} ragContext          - Optional retrieved document context
   * @param {string|null} companySystemPrompt - Optional company-specific system prompt
   */
  async getGeminiReply(chatId, messages, ragContext = null, companySystemPrompt = null) {
    try {
      // Check rate limiting
      if (!this.canMakeCall(chatId)) {
        console.log(`Rate limit hit for chat ${chatId}, using fallback`);
        return this.getFallbackReply();
      }

      // Check if API key is available
      if (!this.apiKey) {
        console.log('No Gemini API key found, using fallback');
        return this.getFallbackReply();
      }

      const contents = this.buildContentsArray(messages);
      
      const basePrompt = companySystemPrompt ? `${companySystemPrompt}\n\nCRITICAL INSTRUCTION:\nIf the user explicitly asks to speak to a human, a real person, an agent, or a manager, OR if the user expresses extreme frustration, you must output a JSON object with handoff_requested set to true.\n\nFormat your response strictly as JSON:\n{\n  "answer": "Your text response to the user here. Leave blank if handing off.",\n  "handoff_requested": true or false\n}` : DEFAULT_SYSTEM_PROMPT;
      let systemText = basePrompt;
      if (ragContext) {
        systemText += `\n\n=== KNOWLEDGE BASE CONTEXT ===\n${ragContext}\n==========================\n\nIMPORTANT: Base your answer on the provided document context above when it is relevant. If the answer is not found in the documents, say so honestly and set handoff_requested to true. Do not make up information.`;
      }

      // Add timeout to prevent long waits
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            role: 'user',
            parts: [{ text: systemText }]
          },
          contents,
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: ragContext ? 400 : 150, // More tokens for RAG answers
            topP: 0.8,
            topK: 40,
            responseMimeType: "application/json"
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API returned ${response.status}: ${errorText}`);
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // Update rate limit tracking
      this.rateLimitMap.set(chatId, Date.now());

      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const jsonText = data.candidates[0].content.parts[0].text;
        try {
          const parsed = JSON.parse(jsonText);
          return {
            answer: parsed.answer || '',
            handoff_requested: parsed.handoff_requested === true
          };
        } catch (e) {
          console.error('Failed to parse Gemini JSON:', e);
          return {
            answer: jsonText, // Fallback if not pure JSON
            handoff_requested: false
          };
        }
      } else {
        throw new Error('Invalid response format from Gemini');
      }

    } catch (error) {
      console.error('Gemini API error:', error.message);
      if (error.name === 'AbortError') {
        console.log('Request timed out, using fallback');
      }
      return this.getFallbackReply();
    }
  }

  // Fallback reply when Gemini is unavailable
  getFallbackReply() {
    return {
      answer: "I apologize, but I'm currently unable to process your request. Let me connect you with a human agent who can help.",
      handoff_requested: true
    };
  }

  // Alternative method that takes messages array directly
  async getGeminiReplyFromMessages(messagesArray) {
    return this.getGeminiReply('fallback', messagesArray);
  }
}

module.exports = new GeminiService();
