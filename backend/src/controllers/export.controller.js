const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const Opportunity = require('../models/Opportunity');
const Task = require('../models/Task');
const Interaction = require('../models/Interaction');
const asyncHandler = require('../utils/asyncHandler');

// Helper to convert array of objects to CSV string
const toCSV = (data, headers) => {
  if (!data || data.length === 0) {
    return headers.join(',') + '\n';
  }

  const headerRow = headers.join(',');
  const rows = data.map((item) =>
    headers
      .map((header) => {
        const value = item[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value).replace(/,/g, ';');
        return String(value).replace(/,/g, ';');
      })
      .join(',')
  );

  return [headerRow, ...rows].join('\n');
};

// @desc    Export leads to CSV
// @route   GET /api/export/leads
// @access  Private
const exportLeads = asyncHandler(async (req, res) => {
  const leads = await Lead.find({ ownerId: req.user.id }).sort({ createdAt: -1 });

  const headers = ['name', 'email', 'phone', 'company', 'source', 'status', 'priority', 'value', 'notes', 'createdAt'];
  const csv = toCSV(leads, headers);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
  res.status(200).send(csv);
});

// @desc    Export contacts to CSV
// @route   GET /api/export/contacts
// @access  Private
const exportContacts = asyncHandler(async (req, res) => {
  const contacts = await Contact.find({ ownerId: req.user.id }).sort({ createdAt: -1 });

  const headers = ['firstName', 'lastName', 'email', 'phone', 'company', 'jobTitle', 'leadId', 'createdAt'];
  const csv = toCSV(contacts, headers);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
  res.status(200).send(csv);
});

// @desc    Export opportunities to CSV
// @route   GET /api/export/opportunities
// @access  Private
const exportOpportunities = asyncHandler(async (req, res) => {
  const opportunities = await Opportunity.find({ ownerId: req.user.id }).sort({ createdAt: -1 });

  const headers = ['title', 'company', 'value', 'stage', 'probability', 'expectedCloseDate', 'notes', 'createdAt'];
  const csv = toCSV(opportunities, headers);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=opportunities.csv');
  res.status(200).send(csv);
});

// @desc    Export tasks to CSV
// @route   GET /api/export/tasks
// @access  Private
const exportTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find({ ownerId: req.user.id }).sort({ createdAt: -1 });

  const headers = ['title', 'description', 'dueDate', 'priority', 'status', 'leadId', 'contactId', 'createdAt'];
  const csv = toCSV(tasks, headers);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=tasks.csv');
  res.status(200).send(csv);
});

// @desc    Export interactions to CSV
// @route   GET /api/export/interactions
// @access  Private
const exportInteractions = asyncHandler(async (req, res) => {
  const interactions = await Interaction.find({ ownerId: req.user.id }).sort({ createdAt: -1 });

  const headers = ['type', 'subject', 'description', 'date', 'leadId', 'contactId', 'createdAt'];
  const csv = toCSV(interactions, headers);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=interactions.csv');
  res.status(200).send(csv);
});

module.exports = { exportLeads, exportContacts, exportOpportunities, exportTasks, exportInteractions };
