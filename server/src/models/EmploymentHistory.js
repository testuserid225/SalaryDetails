const mongoose = require('mongoose');

const employmentHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    jobTitle: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      default: null, // Null indicates ongoing / current
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },
    startingSalary: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalSalary: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    reasonForLeaving: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user and start date for chronologically sorted timelines
employmentHistorySchema.index({ user: 1, startDate: -1 });

module.exports = mongoose.model('EmploymentHistory', employmentHistorySchema);
