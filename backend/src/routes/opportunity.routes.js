const express = require('express');
const router = express.Router();

const {
  getOpportunities,
  getOpportunityBoard,
  getOpportunity,
  createOpportunity,
  updateOpportunity,
  updateOpportunityStage,
  deleteOpportunity,
} = require('../controllers/opportunity.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createOpportunitySchema,
  updateOpportunitySchema,
  updateStageSchema,
  opportunityIdSchema,
} = require('../validators/opportunity.validator');

router.use(protect);

router.route('/')
  .get(getOpportunities)
  .post(validate(createOpportunitySchema), createOpportunity);

router.get('/board', getOpportunityBoard);

router.route('/:id')
  .get(validate(opportunityIdSchema), getOpportunity)
  .put(validate(opportunityIdSchema), validate(updateOpportunitySchema), updateOpportunity)
  .delete(validate(opportunityIdSchema), deleteOpportunity);

router.patch('/:id/stage', validate(updateStageSchema), updateOpportunityStage);

module.exports = router;