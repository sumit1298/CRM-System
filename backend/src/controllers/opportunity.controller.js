const Opportunity = require('../models/Opportunity');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all opportunities (with search, filter, sort, pagination)
// @route   GET /api/opportunities
// @access  Private
const getOpportunities = asyncHandler(async (req, res) => {
  const { search, stage, minValue, maxValue, sortBy, sortOrder, page = 1, limit = 10 } = req.query;

  const query = { ownerId: req.user.id };

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } },
    ];
  }

  if (stage) query.stage = stage;
  if (minValue || maxValue) {
    query.value = {};
    if (minValue) query.value.$gte = Number(minValue);
    if (maxValue) query.value.$lte = Number(maxValue);
  }

  const sortField = sortBy || 'createdAt';
  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortField]: sortDirection };

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const [opportunities, total] = await Promise.all([
    Opportunity.find(query).sort(sort).skip(skip).limit(limitNum),
    Opportunity.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: opportunities,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// @desc    Get all opportunities grouped by stage (for Kanban board)
// @route   GET /api/opportunities/board
// @access  Private
const getOpportunityBoard = asyncHandler(async (req, res) => {
  const opportunities = await Opportunity.find({ ownerId: req.user.id }).sort({ value: -1 });

  const stages = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
  const board = stages.map((stage) => ({
    stage,
    opportunities: opportunities.filter((opp) => opp.stage === stage),
  }));

  res.status(200).json({ success: true, data: board });
});

// @desc    Get single opportunity
// @route   GET /api/opportunities/:id
// @access  Private
const getOpportunity = asyncHandler(async (req, res) => {
  const opportunity = await Opportunity.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!opportunity) {
    throw new AppError('Opportunity not found', 404);
  }
  res.status(200).json({ success: true, data: opportunity });
});

// @desc    Create opportunity
// @route   POST /api/opportunities
// @access  Private
const createOpportunity = asyncHandler(async (req, res) => {
  const opportunity = await Opportunity.create({
    ...req.body,
    ownerId: req.user.id,
  });
  res.status(201).json({ success: true, data: opportunity });
});

// @desc    Update opportunity
// @route   PUT /api/opportunities/:id
// @access  Private
const updateOpportunity = asyncHandler(async (req, res) => {
  let opportunity = await Opportunity.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!opportunity) {
    throw new AppError('Opportunity not found', 404);
  }

  opportunity = await Opportunity.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: opportunity });
});

// @desc    Update opportunity stage (for Kanban drag-and-drop)
// @route   PATCH /api/opportunities/:id/stage
// @access  Private
const updateOpportunityStage = asyncHandler(async (req, res) => {
  const { stage } = req.body;

  let opportunity = await Opportunity.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!opportunity) {
    throw new AppError('Opportunity not found', 404);
  }

  // Auto-update probability based on stage
  const stageProbabilities = {
    'Lead': 20,
    'Qualified': 40,
    'Proposal': 60,
    'Negotiation': 80,
    'Closed Won': 100,
    'Closed Lost': 0,
  };

  const closedAt = ['Closed Won', 'Closed Lost'].includes(stage) ? new Date() : null;

  opportunity = await Opportunity.findByIdAndUpdate(
    req.params.id,
    { stage, probability: stageProbabilities[stage], closedAt },
    { new: true, runValidators: true }
  );

  res.status(200).json({ success: true, data: opportunity });
});

// @desc    Delete opportunity
// @route   DELETE /api/opportunities/:id
// @access  Private
const deleteOpportunity = asyncHandler(async (req, res) => {
  const opportunity = await Opportunity.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!opportunity) {
    throw new AppError('Opportunity not found', 404);
  }

  await opportunity.deleteOne();
  res.status(200).json({ success: true, message: 'Opportunity deleted successfully' });
});

module.exports = {
  getOpportunities,
  getOpportunityBoard,
  getOpportunity,
  createOpportunity,
  updateOpportunity,
  updateOpportunityStage,
  deleteOpportunity,
};