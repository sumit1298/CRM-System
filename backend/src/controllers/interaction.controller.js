const Interaction = require('../models/Interaction');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all interactions (with filter, sort, pagination)
// @route   GET /api/interactions
// @access  Private
const getInteractions = asyncHandler(async (req, res) => {
  const { search, type, leadId, contactId, fromDate, toDate, sortBy, sortOrder, page = 1, limit = 10 } = req.query;

  const query = { ownerId: req.user.id };

  if (search) {
    query.$or = [
      { subject: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  if (type) query.type = type;
  if (leadId) query.leadId = leadId;
  if (contactId) query.contactId = contactId;

  if (fromDate || toDate) {
    query.date = {};
    if (fromDate) query.date.$gte = new Date(fromDate);
    if (toDate) query.date.$lte = new Date(toDate);
  }

  const sortField = sortBy || 'date';
  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortField]: sortDirection };

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const [interactions, total] = await Promise.all([
    Interaction.find(query).sort(sort).skip(skip).limit(limitNum),
    Interaction.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: interactions,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// @desc    Get single interaction
// @route   GET /api/interactions/:id
// @access  Private
const getInteraction = asyncHandler(async (req, res) => {
  const interaction = await Interaction.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!interaction) {
    throw new AppError('Interaction not found', 404);
  }
  res.status(200).json({ success: true, data: interaction });
});

// @desc    Create interaction
// @route   POST /api/interactions
// @access  Private
const createInteraction = asyncHandler(async (req, res) => {
  const interaction = await Interaction.create({
    ...req.body,
    ownerId: req.user.id,
  });
  res.status(201).json({ success: true, data: interaction });
});

// @desc    Update interaction
// @route   PUT /api/interactions/:id
// @access  Private
const updateInteraction = asyncHandler(async (req, res) => {
  let interaction = await Interaction.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!interaction) {
    throw new AppError('Interaction not found', 404);
  }

  interaction = await Interaction.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: interaction });
});

// @desc    Delete interaction
// @route   DELETE /api/interactions/:id
// @access  Private
const deleteInteraction = asyncHandler(async (req, res) => {
  const interaction = await Interaction.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!interaction) {
    throw new AppError('Interaction not found', 404);
  }

  await interaction.deleteOne();
  res.status(200).json({ success: true, message: 'Interaction deleted successfully' });
});

module.exports = { getInteractions, getInteraction, createInteraction, updateInteraction, deleteInteraction };
