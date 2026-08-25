const express = require('express');
const router = express.Router();

const {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
} = require('../controllers/lead.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createLeadSchema, updateLeadSchema, leadIdSchema } = require('../validators/lead.validator');

router.use(protect);

router.route('/')
  .get(getLeads)
  .post(validate(createLeadSchema), createLead);

router.route('/:id')
  .get(validate(leadIdSchema), getLead)
  .put(validate(leadIdSchema), validate(updateLeadSchema), updateLead)
  .delete(validate(leadIdSchema), deleteLead);

module.exports = router;