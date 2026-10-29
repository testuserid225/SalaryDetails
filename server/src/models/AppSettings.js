const mongoose = require('mongoose');

const appSettingsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    currencySymbol: {
      type: String,
      default: '₹',
    },
    financialYearStartMonth: {
      type: Number,
      default: 4, // 4 = April
      min: 1,
      max: 12,
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'light',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AppSettings', appSettingsSchema);
