const { z } = require('zod');

const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Task title is required').max(100),
    description: z.string().max(2000).optional(),
    dueDate: z.string().datetime().optional().nullable(),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
    status: z.enum(['Pending', 'In Progress', 'Completed']).optional(),
    leadId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid lead ID').optional().nullable(),
    contactId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid contact ID').optional().nullable(),
  }),
});

const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(100).optional(),
    description: z.string().max(2000).optional(),
    dueDate: z.string().datetime().optional().nullable(),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
    status: z.enum(['Pending', 'In Progress', 'Completed']).optional(),
    leadId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid lead ID').optional().nullable(),
    contactId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid contact ID').optional().nullable(),
  }),
});

const taskIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid task ID'),
  }),
});

module.exports = { createTaskSchema, updateTaskSchema, taskIdSchema };