const { z } = require('zod');

const createOpportunitySchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Opportunity title is required').max(100),
    company: z.string().min(1, 'Company is required').max(100),
    contactId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid contact ID').optional().nullable(),
    value: z.number().min(0, 'Value cannot be negative'),
    stage: z.enum(['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']).optional(),
    probability: z.number().min(0).max(100).optional(),
    expectedCloseDate: z.string().datetime().optional().nullable(),
    notes: z.string().max(2000).optional(),
  }),
});

const updateOpportunitySchema = z.object({
  body: z.object({
    title: z.string().min(1).max(100).optional(),
    company: z.string().min(1).max(100).optional(),
    contactId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid contact ID').optional().nullable(),
    value: z.number().min(0).optional(),
    stage: z.enum(['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']).optional(),
    probability: z.number().min(0).max(100).optional(),
    expectedCloseDate: z.string().datetime().optional().nullable(),
    notes: z.string().max(2000).optional(),
  }),
});

const updateStageSchema = z.object({
  body: z.object({
    stage: z.enum(['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']),
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid opportunity ID'),
  }),
});

const opportunityIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid opportunity ID'),
  }),
});

module.exports = {
  createOpportunitySchema,
  updateOpportunitySchema,
  updateStageSchema,
  opportunityIdSchema,
};