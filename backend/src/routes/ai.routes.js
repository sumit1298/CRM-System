const express = require('express');
const router = express.Router();

const {
  getLeadSummary,
  getRiskScore,
  getEmailDraft,
  getNextAction,
  getPipelineHealth,
  askCRMQuestion,
  indexCRMData,
} = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/pipeline-health', getPipelineHealth);
router.post('/index', indexCRMData);
router.post('/rag/query', askCRMQuestion);
router.post('/leads/:id/summary', getLeadSummary);
router.post('/leads/:id/email', getEmailDraft);
router.post('/leads/:id/next-action', getNextAction);
router.post('/opportunities/:id/risk', getRiskScore);

module.exports = router;