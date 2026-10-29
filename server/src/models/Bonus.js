const mongoose = require('mongoose');

const bonusSchema = new mongoose.Schema(
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
      default: 'Current Employer',
    },
    bonusMonth: {
      type: Number,
      min: 1,
      max: 12,
      default: () => new Date().getMonth() + 1,
    },
    bonusYear: {
      type: Number,
      default: () => new Date().getFullYear(),
    },
    bonusPeriod: {
      type: String,
      trim: true,
      default: '',
    },
    monthlyBonusAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    monthlyBonusGiven: {
      type: Number,
      default: 0,
      min: 0,
    },
    deductionAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['Given', 'Paid', 'Pending', 'Partially Given', 'Cancelled', 'Unpaid', 'No Bonus'],
      default: 'Given',
      trim: true,
    },
    bonusType: {
      type: String,
      default: 'Monthly Bonus',
    },
    bonusApprovalDate: {
      type: Date,
    },
    expectedPaymentDate: {
      type: Date,
    },
    actualPaymentDate: {
      type: Date,
    },
    bonusAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    bonusStatus: {
      type: String,
      enum: ['Paid', 'Given', 'Expected', 'Approved', 'Pending', 'Cancelled'],
      default: 'Paid',
    },
    bonusReason: {
      type: String,
      trim: true,
      default: '',
    },
    includedInPayroll: {
      type: Boolean,
      default: false,
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

bonusSchema.index({ user: 1, actualPaymentDate: -1 });
bonusSchema.index({ user: 1, bonusStatus: 1 });

module.exports = mongoose.model('Bonus', bonusSchema);
