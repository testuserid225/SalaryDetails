const mongoose = require('mongoose');

const salaryIncrementSchema = new mongoose.Schema(
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
    previousMonthlySalary: {
      type: Number,
      required: [true, 'Previous monthly salary is required'],
      min: 0,
    },
    newMonthlySalary: {
      type: Number,
      required: [true, 'New monthly salary is required'],
      min: 0,
    },
    previousAnnualSalary: {
      type: Number,
      default: function () {
        return (this.previousMonthlySalary || 0) * 12;
      },
    },
    newAnnualSalary: {
      type: Number,
      default: function () {
        return (this.newMonthlySalary || 0) * 12;
      },
    },
    incrementEffectiveDate: {
      type: Date,
      required: [true, 'Increment effective date is required'],
    },
    incrementType: {
      type: String,
      enum: ['Annual Appraisal', 'Promotion', 'Performance', 'Market Adjustment', 'Other'],
      default: 'Annual Appraisal',
    },
    incrementAmount: {
      type: Number,
      required: true,
    },
    incrementPercentage: {
      type: Number,
      required: true,
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

salaryIncrementSchema.index({ user: 1, incrementEffectiveDate: -1 });

module.exports = mongoose.model('SalaryIncrement', salaryIncrementSchema);
