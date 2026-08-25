const express = require('express');
const router = express.Router();

const {
  getInteractions,
  getInteraction,
  createInteraction,
  updateInteraction,
  deleteInteraction,
} = require('../controllers/interaction.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createInteractionSchema, updateInteractionSchema, interactionIdSchema } = require('../validators/interaction.validator');

router.use(protect);

router.route('/')
  .get(getInteractions)
  .post(validate(createInteractionSchema), createInteraction);

router.route('/:id')
  .get(validate(interactionIdSchema), getInteraction)
  .put(validate(updateInteractionSchema), updateInteraction)
  .delete(validate(interactionIdSchema), deleteInteraction);

module.exports = router;