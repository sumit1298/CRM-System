const Lead = require('../models/Lead');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const sanitizeMongoQuery = require('../utils/sanitizeQuery');

// @desc    Get all leads (with search, filter, sort, pagination)
// @route   GET /api/leads
// @access  Private
const getLeads = asyncHandler(async (req, res) => {
  const safeQuery = sanitizeMongoQuery(req.query);
  const { search, status, priority, source, minValue, maxValue, sortBy, sortOrder, page = 1, limit = 10 } = safeQuery;

  // Build query with owner-based multi-tenancy
  const query = { ownerId: req.user.id };

  // Search
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  // Filters
  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (source) query.source = source;
  if (minValue || maxValue) {
    query.value = {};
    if (minValue) query.value.$gte = Number(minValue);
    if (maxValue) query.value.$lte = Number(maxValue);
  }

  // Sorting
  const sortField = sortBy || 'createdAt';
  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortField]: sortDirection };

  // Pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const [leads, total] = await Promise.all([
    Lead.find(query).sort(sort).skip(skip).limit(limitNum),
    Lead.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: leads,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// @desc    Get single lead
// @route   GET /api/leads/:id
// @access  Private
const getLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!lead) {
    throw new AppError('Lead not found', 404);
  }
  res.status(200).json({ success: true, data: lead });
});

// @desc    Create lead
// @route   POST /api/leads
// @access  Private
const createLead = asyncHandler(async (req, res) => {
  const lead = await Lead.create({
    ...req.body,
    ownerId: req.user.id,
  });
  res.status(201).json({ success: true, data: lead });
});

// @desc    Update lead
// @route   PUT /api/leads/:id
// @access  Private
const updateLead = asyncHandler(async (req, res) => {
  let lead = await Lead.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!lead) {
    throw new AppError('Lead not found', 404);
  }

  lead = await Lead.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: lead });
});

// @desc    Delete lead
// @route   DELETE /api/leads/:id
// @access  Private
const deleteLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!lead) {
    throw new AppError('Lead not found', 404);
  }

  await lead.deleteOne();
  res.status(200).json({ success: true, message: 'Lead deleted successfully' });
});

module.exports = { getLeads, getLead, createLead, updateLead, deleteLead };