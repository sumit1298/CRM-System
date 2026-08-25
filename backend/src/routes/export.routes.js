const express = require('express');
const router = express.Router();

const {
  exportLeads,
  exportContacts,
  exportOpportunities,
  exportTasks,
  exportInteractions,
} = require('../controllers/export.controller');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/leads', exportLeads);
router.get('/contacts', exportContacts);
router.get('/opportunities', exportOpportunities);
router.get('/tasks', exportTasks);
router.get('/interactions', exportInteractions);

module.exports = router;