const mongoose = require('mongoose');

const employmentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One profile per user
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    employeeId: {
      type: String,
      trim: true,
      default: '',
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    jobTitle: {
      type: String,
      required: [true, 'Job title/Designation is required'],
      trim: true,
    },
    department: {
      type: String,
      trim: true,
      default: '',
    },
    employmentType: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'],
      default: 'Full-time',
    },
    joiningDate: {
      type: Date,
      required: [true, 'Joining date is required'],
    },
    previousExperienceYears: {
      type: Number,
      default: 0,
      min: 0,
    },
    previousExperienceMonths: {
      type: Number,
      default: 0,
      min: 0,
      max: 11,
    },
    employmentStatus: {
      type: String,
      enum: ['Active', 'Resigned', 'On Leave'],
      default: 'Active',
    },
    currentMonthlyBasicSalary: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentMonthlyGrossSalary: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentMonthlyTakeHomeSalary: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    workLocation: {
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

module.exports = mongoose.model('EmploymentProfile', employmentProfileSchema);
