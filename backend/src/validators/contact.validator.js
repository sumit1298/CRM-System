const { z } = require('zod');

const createContactSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    email: z.string().email('Please provide a valid email address'),
    phone: z.string().max(20).optional(),
    company: z.string().max(100).optional(),
    jobTitle: z.string().max(100).optional(),
    leadId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid lead ID').optional().nullable(),
    notes: z.string().max(2000).optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const updateContactSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(20).optional(),
    company: z.string().max(100).optional(),
    jobTitle: z.string().max(100).optional(),
    leadId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid lead ID').optional().nullable(),
    notes: z.string().max(2000).optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const contactIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid contact ID'),
  }),
});

module.exports = { createContactSchema, updateContactSchema, contactIdSchema };