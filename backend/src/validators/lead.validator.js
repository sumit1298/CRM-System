const { z } = require('zod');

const createLeadSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Lead name is required').max(100),
    email: z.string().email('Please provide a valid email address'),
    phone: z.string().max(20).optional(),
    company: z.string().max(100).optional(),
    source: z.enum(['Website', 'Referral', 'Social Media', 'Email Campaign', 'Cold Call', 'Event', 'Other']).optional(),
    status: z.enum(['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']).optional(),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
    value: z.number().min(0).optional(),
    assignedTo: z.string().max(100).optional(),
    notes: z.string().max(2000).optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const updateLeadSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(20).optional(),
    company: z.string().max(100).optional(),
    source: z.enum(['Website', 'Referral', 'Social Media', 'Email Campaign', 'Cold Call', 'Event', 'Other']).optional(),
    status: z.enum(['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']).optional(),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
    value: z.number().min(0).optional(),
    assignedTo: z.string().max(100).optional(),
    notes: z.string().max(2000).optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const leadIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid lead ID'),
  }),
});

module.exports = { createLeadSchema, updateLeadSchema, leadIdSchema };