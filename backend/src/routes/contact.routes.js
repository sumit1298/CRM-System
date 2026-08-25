const express = require('express');
const router = express.Router();

const {
  getContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
} = require('../controllers/contact.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createContactSchema, updateContactSchema, contactIdSchema } = require('../validators/contact.validator');

router.use(protect);

router.route('/')
  .get(getContacts)
  .post(validate(createContactSchema), createContact);

router.route('/:id')
  .get(validate(contactIdSchema), getContact)
  .put(validate(contactIdSchema), validate(updateContactSchema), updateContact)
  .delete(validate(contactIdSchema), deleteContact);

module.exports = router;