const AppSettings = require('../models/AppSettings');

// Currency symbol lookup map
const currencySymbols = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  SGD: 'S$',
  AED: 'AED',
};

// @desc    Get user's application settings
// @route   GET /api/settings
// @access  Private
const getSettings = async (req, res, next) => {
  try {
    let settings = await AppSettings.findOne({ user: req.user.id });

    if (!settings) {
      settings = await AppSettings.create({
        user: req.user.id,
        currency: 'INR',
        currencySymbol: '₹',
        financialYearStartMonth: 4,
        theme: 'light',
      });
    }

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user's application settings
// @route   PUT /api/settings
// @access  Private
const updateSettings = async (req, res, next) => {
  try {
    const { currency, financialYearStartMonth, theme } = req.body;

    let settings = await AppSettings.findOne({ user: req.user.id });

    if (!settings) {
      settings = new AppSettings({ user: req.user.id });
    }

    if (currency) {
      settings.currency = currency;
      settings.currencySymbol = currencySymbols[currency] || currency;
    }

    if (financialYearStartMonth !== undefined) {
      const monthNum = Number(financialYearStartMonth);
      if (monthNum >= 1 && monthNum <= 12) {
        settings.financialYearStartMonth = monthNum;
      }
    }

    if (theme && ['light', 'dark', 'system'].includes(theme)) {
      settings.theme = theme;
    }

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully.',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
