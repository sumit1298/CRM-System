const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');
const Interaction = require('../models/Interaction');
const Conversation = require('../models/Conversation');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const {
  generateLeadSummary,
  calculateRiskScore,
  generateEmail,
  suggestNextAction,
  analyzePipelineHealth,
} = require('../services/gemini.service');
const { askRAGQuestion, indexCRMDocuments } = require('../services/aiService');
const { sanitizeAIInput, validateAIResponse } = require('../services/aiGuardrails');

// @desc    Generate AI summary for a lead
// @route   POST /api/ai/leads/:id/summary
// @access  Private
const getLeadSummary = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!lead) {
    throw new AppError('Lead not found', 404);
  }

  const summary = await generateLeadSummary(lead);
  res.status(200).json({ success: true, data: { summary } });
});

// @desc    Calculate AI risk score for an opportunity
// @route   POST /api/ai/opportunities/:id/risk
// @access  Private
const getRiskScore = asyncHandler(async (req, res) => {
  const opportunity = await Opportunity.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!opportunity) {
    throw new AppError('Opportunity not found', 404);
  }

  const risk = await calculateRiskScore(opportunity);
  res.status(200).json({ success: true, data: risk });
});

// @desc    Generate AI follow-up email for a lead
// @route   POST /api/ai/leads/:id/email
// @access  Private
const getEmailDraft = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!lead) {
    throw new AppError('Lead not found', 404);
  }

  const { context } = req.body;
  const email = await generateEmail(lead, context);
  res.status(200).json({ success: true, data: { email } });
});

// @desc    Suggest next best action for a lead
// @route   POST /api/ai/leads/:id/next-action
// @access  Private
const getNextAction = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!lead) {
    throw new AppError('Lead not found', 404);
  }

  const interactions = await Interaction.find({ leadId: lead._id, ownerId: req.user.id })
    .sort({ date: -1 })
    .limit(10);

  const suggestion = await suggestNextAction(lead, interactions);
  res.status(200).json({ success: true, data: { suggestion } });
});

// @desc    Analyze pipeline health
// @route   GET /api/ai/pipeline-health
// @access  Private
const getPipelineHealth = asyncHandler(async (req, res) => {
  const opportunities = await Opportunity.find({ ownerId: req.user.id });
  const analysis = await analyzePipelineHealth(opportunities);
  res.status(200).json({ success: true, data: { analysis } });
});

// @desc    Ask the AI service a CRM question using RAG-style retrieval
// @route   POST /api/ai/rag/query
// @access  Private
const askCRMQuestion = asyncHandler(async (req, res) => {
  const { question, sessionId, topK = 5, context = [] } = req.body;

  if (!question || !question.trim()) {
    throw new AppError('A question is required', 400);
  }

  const sanitizedQuestion = sanitizeAIInput(question);
  const resolvedSessionId = sessionId || `session-${Date.now()}`;

  let conversation = await Conversation.findOne({
    ownerId: req.user.id,
    sessionId: resolvedSessionId,
  });

  const previousMessages = conversation?.messages.map((message) => ({
    role: message.role,
    content: message.content,
  })) || [];

  const aiResponse = await askRAGQuestion(sanitizedQuestion, {
    ownerId: req.user.id,
    sessionId: resolvedSessionId,
    topK,
    context,
    history: previousMessages,
  });

  const safeAnswer = validateAIResponse(aiResponse.answer, {
    maxLength: 3000,
    mustContainText: true,
  });

  const nextUserMessage = { role: 'user', content: sanitizedQuestion };
  const nextAssistantMessage = { role: 'assistant', content: safeAnswer };

  if (conversation) {
    conversation.messages.push(nextUserMessage, nextAssistantMessage);
    await conversation.save();
  } else {
    await Conversation.create({
      ownerId: req.user.id,
      sessionId: resolvedSessionId,
      messages: [nextUserMessage, nextAssistantMessage],
    });
  }

  res.status(200).json({
    success: true,
    data: {
      answer: safeAnswer,
      sessionId: aiResponse.sessionId || resolvedSessionId,
      context: aiResponse.context || [],
      status: aiResponse.status || 'ok',
    },
  });
});

const indexCRMData = asyncHandler(async (req, res) => {
  const [leads, opportunities, interactions] = await Promise.all([
    Lead.find({ ownerId: req.user.id }).lean(),
    Opportunity.find({ ownerId: req.user.id }).lean(),
    Interaction.find({ ownerId: req.user.id }).lean(),
  ]);

  const documents = [
    ...leads.map((lead) => ({
      text: [
        `Lead: ${lead.name}`,
        `Email: ${lead.email}`,
        `Company: ${lead.company || 'Unknown'}`,
        `Status: ${lead.status || 'New'}`,
        `Priority: ${lead.priority || 'Medium'}`,
        `Value: ${lead.value || 0}`,
        `Notes: ${lead.notes || 'No notes provided'}`,
      ].join('\n'),
      metadata: {
        source: 'lead',
        ownerId: req.user.id.toString(),
        recordId: lead._id.toString(),
      },
    })),
    ...opportunities.map((opportunity) => ({
      text: [
        `Opportunity: ${opportunity.title}`,
        `Company: ${opportunity.company}`,
        `Stage: ${opportunity.stage || 'Lead'}`,
        `Value: ${opportunity.value || 0}`,
        `Probability: ${opportunity.probability || 0}%`,
        `Notes: ${opportunity.notes || 'No notes provided'}`,
      ].join('\n'),
      metadata: {
        source: 'opportunity',
        ownerId: req.user.id.toString(),
        recordId: opportunity._id.toString(),
      },
    })),
    ...interactions.map((interaction) => ({
      text: [
        `Interaction: ${interaction.type}`,
        `Subject: ${interaction.subject}`,
        `Date: ${new Date(interaction.date).toISOString()}`,
        `Description: ${interaction.description || 'No details provided'}`,
      ].join('\n'),
      metadata: {
        source: 'interaction',
        ownerId: req.user.id.toString(),
        recordId: interaction._id.toString(),
      },
    })),
  ];

  const result = await indexCRMDocuments(documents, { ownerId: req.user.id });

  res.status(200).json({
    success: true,
    data: {
      indexed: result.indexed,
      status: result.status || 'ok',
      source: 'crm-index',
    },
  });
});

module.exports = {
  getLeadSummary,
  getRiskScore,
  getEmailDraft,
  getNextAction,
  getPipelineHealth,
  askCRMQuestion,
  indexCRMData,
};