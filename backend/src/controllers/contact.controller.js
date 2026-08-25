const Contact = require('../models/Contact');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all contacts (with search, filter, sort, pagination)
// @route   GET /api/contacts
// @access  Private
const getContacts = asyncHandler(async (req, res) => {
  const { search, leadId, sortBy, sortOrder, page = 1, limit = 10 } = req.query;

  const query = { ownerId: req.user.id };

  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } },
    ];
  }

  if (leadId) query.leadId = leadId;

  const sortField = sortBy || 'createdAt';
  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortField]: sortDirection };

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const [contacts, total] = await Promise.all([
    Contact.find(query).sort(sort).skip(skip).limit(limitNum),
    Contact.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: contacts,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// @desc    Get single contact
// @route   GET /api/contacts/:id
// @access  Private
const getContact = asyncHandler(async (req, res) => {
  const contact = await Contact.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!contact) {
    throw new AppError('Contact not found', 404);
  }
  res.status(200).json({ success: true, data: contact });
});

// @desc    Create contact
// @route   POST /api/contacts
// @access  Private
const createContact = asyncHandler(async (req, res) => {
  const contact = await Contact.create({
    ...req.body,
    ownerId: req.user.id,
  });
  res.status(201).json({ success: true, data: contact });
});

// @desc    Update contact
// @route   PUT /api/contacts/:id
// @access  Private
const updateContact = asyncHandler(async (req, res) => {
  let contact = await Contact.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!contact) {
    throw new AppError('Contact not found', 404);
  }

  contact = await Contact.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: contact });
});

// @desc    Delete contact
// @route   DELETE /api/contacts/:id
// @access  Private
const deleteContact = asyncHandler(async (req, res) => {
  const contact = await Contact.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!contact) {
    throw new AppError('Contact not found', 404);
  }

  await contact.deleteOne();
  res.status(200).json({ success: true, message: 'Contact deleted successfully' });
});

module.exports = { getContacts, getContact, createContact, updateContact, deleteContact };