const { z } = require('zod');

const createInteractionSchema = z.object({
  body: z.object({
    type: z.enum(['Call', 'Email', 'Meeting', 'Note']),
    subject: z.string().min(1, 'Subject is required').max(200),
    description: z.string().max(2000).optional(),
    leadId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid lead ID').optional().nullable(),
    contactId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid contact ID').optional().nullable(),
    date: z.string().datetime().optional(),
  }),
});

const updateInteractionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid interaction ID'),
  }),
  body: z.object({
    type: z.enum(['Call', 'Email', 'Meeting', 'Note']).optional(),
    subject: z.string().min(1, 'Subject is required').max(200).optional(),
    description: z.string().max(2000).optional(),
    leadId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid lead ID').optional().nullable(),
    contactId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid contact ID').optional().nullable(),
    date: z.string().datetime().optional(),
  }),
});

const interactionIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid interaction ID'),
  }),
});

module.exports = { createInteractionSchema, updateInteractionSchema, interactionIdSchema };
