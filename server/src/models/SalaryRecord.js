const mongoose = require('mongoose');

const salaryRecordSchema = new mongoose.Schema(
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
    effectiveDate: {
      type: Date,
      required: [true, 'Effective / Created date is required'],
    },
    createdDate: {
      type: Date,
      default: Date.now,
    },
    salaryMonth: {
      type: Number,
      required: [true, 'Salary month (1-12) is required'],
      min: 1,
      max: 12,
    },
    salaryYear: {
      type: Number,
      required: [true, 'Salary year is required'],
      min: 1990,
      max: 2100,
    },

    // Detailed Columns from Screenshot
    salary: {
      type: Number,
      required: [true, 'Salary (Base / Gross) is required'],
      min: 0,
    },
    workingDays: {
      type: Number,
      default: 30,
      min: 1,
    },
    perDaySalary: {
      type: Number,
      default: 0,
      min: 0,
    },
    leaveTaken: {
      type: Number,
      default: 0,
      min: 0,
    },
    leaveDeductionAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    pt: {
      type: Number,
      default: 0,
      min: 0, // Professional Tax
    },
    pfAmount: {
      type: Number,
      default: 0,
      min: 0, // Provident Fund
    },
    esic: {
      type: Number,
      default: 0,
      min: 0, // ESIC
    },
    differencePerMonthAmount: {
      type: Number,
      default: 0, // Difference Per Month Amount (arrears/adjustments)
    },
    amount: {
      type: Number,
      required: [true, 'Net Amount received is required'],
      min: 0,
    },
    remark: {
      type: String,
      trim: true,
      default: '',
    },

    // Additional payroll breakdowns for comprehensive tracking & backward compatibility
    monthlyBasicSalary: {
      type: Number,
      default: 0,
    },
    hra: {
      type: Number,
      default: 0,
    },
    otherAllowances: {
      type: Number,
      default: 0,
    },
    bonusIncludedInPayroll: {
      type: Number,
      default: 0,
    },
    deductions: {
      type: Number,
      default: 0,
    },
    grossSalary: {
      type: Number,
      default: 0,
    },
    takeHomeSalary: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Received', 'Expected'],
      default: 'Received',
    },
    isCurrent: {
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

// Helpful indexes
salaryRecordSchema.index({ user: 1, salaryYear: -1, salaryMonth: -1 });
salaryRecordSchema.index({ user: 1, companyName: 1, salaryYear: 1, salaryMonth: 1 });

module.exports = mongoose.model('SalaryRecord', salaryRecordSchema);
