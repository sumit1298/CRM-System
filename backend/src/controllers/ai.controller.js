const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');
const Interaction = require('../models/Interaction');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const {
  generateLeadSummary,
  calculateRiskScore,
  generateEmail,
  suggestNextAction,
  analyzePipelineHealth,
} = require('../services/gemini.service');

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

module.exports = {
  getLeadSummary,
  getRiskScore,
  getEmailDraft,
  getNextAction,
  getPipelineHealth,
};