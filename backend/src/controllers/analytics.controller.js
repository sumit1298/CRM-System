const Lead = require('../models/Lead');
const mongoose = require('mongoose');
const Contact = require('../models/Contact');
const Opportunity = require('../models/Opportunity');
const asyncHandler = require('../utils/asyncHandler');

const getDateRange = (from, to) => {
  const createdAt = {};
  if (from) createdAt.$gte = new Date(from);
  if (to) {
    const endDate = new Date(to);
    endDate.setUTCHours(23, 59, 59, 999);
    createdAt.$lte = endDate;
  }
  return Object.keys(createdAt).length ? { createdAt } : {};
};

const getAnalytics = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const ownerId = new mongoose.Types.ObjectId(req.user.id);
  const dateRange = getDateRange(from, to);
  const leadMatch = { ownerId, ...dateRange };
  const opportunityMatch = { ownerId, ...dateRange };
  const monthFormat = '%Y-%m';

  const [trend, sourceFunnel, forecast, cycle, quality] = await Promise.all([
    Lead.aggregate([
      { $match: leadMatch },
      { $group: { _id: { $dateToString: { format: monthFormat, date: '$createdAt' } }, leads: { $sum: 1 }, value: { $sum: '$value' } } },
      { $sort: { _id: 1 } },
    ]),
    Lead.aggregate([
      { $match: leadMatch },
      { $group: {
        _id: '$source',
        total: { $sum: 1 },
        qualified: { $sum: { $cond: [{ $in: ['$status', ['Qualified', 'Proposal', 'Negotiation', 'Won']] }, 1, 0] } },
        won: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] } },
        lost: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } },
      } },
      { $sort: { total: -1 } },
    ]),
    Opportunity.aggregate([
      { $match: { ...opportunityMatch, stage: { $nin: ['Closed Won', 'Closed Lost'] } } },
      { $group: { _id: null, pipelineValue: { $sum: '$value' }, weightedValue: { $sum: { $multiply: ['$value', { $divide: ['$probability', 100] }] } } } },
    ]),
    Opportunity.aggregate([
      { $match: { ...opportunityMatch, stage: { $in: ['Closed Won', 'Closed Lost'] }, closedAt: { $ne: null } } },
      { $project: { stage: 1, days: { $divide: [{ $subtract: ['$closedAt', '$createdAt'] }, 86400000] } } },
      { $group: { _id: '$stage', deals: { $sum: 1 }, averageDays: { $avg: '$days' }, minDays: { $min: '$days' }, maxDays: { $max: '$days' } } },
    ]),
    Promise.all([
      Lead.aggregate([{ $match: { ownerId } }, { $group: { _id: '$email', count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $count: 'duplicateEmails' }]),
      Contact.aggregate([{ $match: { ownerId } }, { $group: { _id: '$email', count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $count: 'duplicateEmails' }]),
      Lead.countDocuments({ ownerId, $or: [{ company: { $in: [null, ''] } }, { phone: { $in: [null, ''] } }] }),
      Opportunity.countDocuments({ ownerId, stage: { $in: ['Closed Won', 'Closed Lost'] }, closedAt: null }),
      Opportunity.countDocuments({ ownerId, probability: { $lt: 0 } }),
    ]),
  ]);

  const cycleByOutcome = cycle.reduce((result, item) => ({ ...result, [item._id]: item }), {});
  const duplicateLeadEmails = quality[0][0]?.duplicateEmails || 0;
  const duplicateContactEmails = quality[1][0]?.duplicateEmails || 0;

  res.status(200).json({
    success: true,
    data: {
      filters: { from: from || null, to: to || null },
      trend,
      sourceFunnel,
      forecast: forecast[0] || { pipelineValue: 0, weightedValue: 0 },
      winLoss: {
        won: cycleByOutcome['Closed Won'] || { deals: 0, averageDays: 0 },
        lost: cycleByOutcome['Closed Lost'] || { deals: 0, averageDays: 0 },
      },
      dataQuality: {
        duplicateLeadEmails,
        duplicateContactEmails,
        leadsMissingCompanyOrPhone: quality[2],
        closedOpportunitiesMissingClosedAt: quality[3],
        opportunitiesWithInvalidProbability: quality[4],
      },
    },
  });
});

module.exports = { getAnalytics };