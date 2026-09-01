const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const fallbackAskRAGQuestion = (question, options = {}) => ({
  answer: `The AI service is temporarily unavailable, but I can still help with the CRM question: "${String(question || '').slice(0, 180)}". Please retry once the AI service is back online.`,
  sessionId: options.sessionId || 'local-session',
  context: options.context || [],
  status: 'fallback',
});

const fallbackIndexCRMDocuments = (documents = []) => {
  const validDocuments = (documents || []).filter((doc) => doc && typeof doc.text === 'string' && doc.text.trim());
  return {
    status: 'ok',
    indexed: validDocuments.length,
    count: validDocuments.length,
    fallback: true,
  };
};

const askRAGQuestion = async (question, options = {}) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/api/rag/query`, {
      question,
      ownerId: options.ownerId,
      sessionId: options.sessionId,
      topK: options.topK || 5,
      context: options.context || [],
      history: options.history || [],
    }, {
      timeout: 60000,
    });

    return response.data;
  } catch (error) {
    return fallbackAskRAGQuestion(question, options);
  }
};

const indexCRMDocuments = async (documents = [], options = {}) => {
  try {
    const payload = {
      documents: documents.map((document) => ({
        text: document.text,
        metadata: {
          ...(document.metadata || {}),
          ownerId: options.ownerId || document.metadata?.ownerId,
        },
      })),
    };

    const response = await axios.post(`${AI_SERVICE_URL}/api/rag/index`, payload, {
      timeout: 60000,
    });

    return response.data;
  } catch (error) {
    return fallbackIndexCRMDocuments(documents);
  }
};

module.exports = {
  askRAGQuestion,
  indexCRMDocuments,
};
