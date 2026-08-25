const Lead = require('../models/Lead');
const mongoose = require('mongoose');
const Contact = require('../models/Contact');
const Opportunity = require('../models/Opportunity');
const Task = require('../models/Task');
const Interaction = require('../models/Interaction');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get dashboard KPIs and analytics
// @route   GET /api/dashboard
// @access  Private
const getDashboard = asyncHandler(async (req, res) => {
  const ownerId = new mongoose.Types.ObjectId(req.user.id);

  // KPI counts
  const [totalLeads, totalContacts, totalOpportunities, totalTasks, openTasks, wonOpportunities, lostOpportunities] =
    await Promise.all([
      Lead.countDocuments({ ownerId }),
      Contact.countDocuments({ ownerId }),
      Opportunity.countDocuments({ ownerId }),
      Task.countDocuments({ ownerId }),
      Task.countDocuments({ ownerId, status: { $ne: 'Completed' } }),
      Opportunity.countDocuments({ ownerId, stage: 'Closed Won' }),
      Opportunity.countDocuments({ ownerId, stage: 'Closed Lost' }),
    ]);

  // Pipeline value (sum of open opportunities)
  const pipelineAgg = await Opportunity.aggregate([
    { $match: { ownerId, stage: { $nin: ['Closed Won', 'Closed Lost'] } } },
    { $group: { _id: null, totalValue: { $sum: '$value' }, avgValue: { $avg: '$value' } } },
  ]);

  // Won revenue
  const wonAgg = await Opportunity.aggregate([
    { $match: { ownerId, stage: 'Closed Won' } },
    { $group: { _id: null, totalRevenue: { $sum: '$value' } } },
  ]);

  // Leads by status
  const leadsByStatus = await Lead.aggregate([
    { $match: { ownerId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // Opportunities by stage
  const opportunitiesByStage = await Opportunity.aggregate([
    { $match: { ownerId } },
    { $group: { _id: '$stage', count: { $sum: 1 }, value: { $sum: '$value' } } },
  ]);

  // Tasks by status
  const tasksByStatus = await Task.aggregate([
    { $match: { ownerId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // Interactions by type
  const interactionsByType = await Interaction.aggregate([
    { $match: { ownerId } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);

  // Recent leads
  const recentLeads = await Lead.find({ ownerId }).sort({ createdAt: -1 }).limit(5);

  // Upcoming tasks
  const upcomingTasks = await Task.find({ ownerId, status: { $ne: 'Completed' }, dueDate: { $ne: null } })
    .sort({ dueDate: 1 })
    .limit(5);

  // Conversion rate (won / total closed)
  const totalClosed = wonOpportunities + lostOpportunities;
  const conversionRate = totalClosed > 0 ? Math.round((wonOpportunities / totalClosed) * 100) : 0;

  res.status(200).json({
    success: true,
    data: {
      kpis: {
        totalLeads,
        totalContacts,
        totalOpportunities,
        totalTasks,
        openTasks,
        wonOpportunities,
        lostOpportunities,
        pipelineValue: pipelineAgg[0]?.totalValue || 0,
        avgDealValue: pipelineAgg[0]?.avgValue || 0,
        totalRevenue: wonAgg[0]?.totalRevenue || 0,
        conversionRate,
      },
      charts: {
        leadsByStatus,
        opportunitiesByStage,
        tasksByStatus,
        interactionsByType,
      },
      recent: {
        recentLeads,
        upcomingTasks,
      },
    },
  });
});

module.exports = { getDashboard };