const mongoose = require('mongoose');

const otherIncomeRecordSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recordType: {
      type: String,
      enum: ['Other Income', 'Deduction'],
      required: true,
      default: 'Other Income',
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0,
    },
    transactionDate: {
      type: Date,
      required: [true, 'Transaction date is required'],
    },
    company: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    paymentStatus: {
      type: String,
      enum: ['Received', 'Paid', 'Expected', 'Pending'],
      default: 'Received',
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

otherIncomeRecordSchema.index({ user: 1, transactionDate: -1 });

module.exports = mongoose.model('OtherIncomeRecord', otherIncomeRecordSchema);
