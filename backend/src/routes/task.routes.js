const express = require('express');
const router = express.Router();

const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
} = require('../controllers/task.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createTaskSchema, updateTaskSchema, taskIdSchema } = require('../validators/task.validator');

router.use(protect);

router.route('/')
  .get(getTasks)
  .post(validate(createTaskSchema), createTask);

router.route('/:id')
  .get(validate(taskIdSchema), getTask)
  .put(validate(taskIdSchema), validate(updateTaskSchema), updateTask)
  .delete(validate(taskIdSchema), deleteTask);

module.exports = router;