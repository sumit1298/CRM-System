const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Opportunity title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    company: {
      type: String,
      required: [true, 'Company is required'],
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters'],
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      default: null,
    },
    value: {
      type: Number,
      required: [true, 'Deal value is required'],
      min: [0, 'Value cannot be negative'],
    },
    stage: {
      type: String,
      enum: ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
      default: 'Lead',
      index: true,
    },
    probability: {
      type: Number,
      min: [0, 'Probability cannot be less than 0'],
      max: [100, 'Probability cannot exceed 100'],
      default: 20,
    },
    expectedCloseDate: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
      index: true,
    },
    notes: {
      type: String,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for search and filtering
opportunitySchema.index({ title: 'text', company: 'text' });
opportunitySchema.index({ ownerId: 1, stage: 1 });
opportunitySchema.index({ ownerId: 1, value: -1 });
opportunitySchema.index({ ownerId: 1, expectedCloseDate: 1 });

module.exports = mongoose.model('Opportunity', opportunitySchema);