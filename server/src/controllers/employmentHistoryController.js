const EmploymentHistory = require('../models/EmploymentHistory');
const EmploymentProfile = require('../models/EmploymentProfile');
const {
  calculateDateDifference,
  calculateTotalCareerExperience,
} = require('../services/experienceService');

// @desc    Get all employment history entries with duration calculations and timeline
// @route   GET /api/employment-history
// @access  Private
const getHistories = async (req, res, next) => {
  try {
    const histories = await EmploymentHistory.find({ user: req.user.id }).sort({ startDate: -1 });
    const profile = await EmploymentProfile.findOne({ user: req.user.id });

    // Augment each history item with its duration
    const items = histories.map(h => {
      const start = h.startDate;
      const end = h.isCurrent || !h.endDate ? new Date() : h.endDate;
      const duration = calculateDateDifference(start, end);

      return {
        ...h.toObject(),
        duration,
      };
    });

    // Total non-overlapping career experience
    const totalCareerExperience = calculateTotalCareerExperience(profile, histories);

    res.status(200).json({
      success: true,
      data: items,
      totalCareerExperience,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new employment history entry
// @route   POST /api/employment-history
// @access  Private
const createHistory = async (req, res, next) => {
  try {
    const {
      companyName,
      jobTitle,
      startDate,
      endDate,
      isCurrent,
      startingSalary,
      finalSalary,
      currency,
      reasonForLeaving,
      notes,
    } = req.body;

    if (!companyName || !jobTitle || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'Company name, job title, and start date are required.',
      });
    }

    // If marked current, ensure previous current records are updated
    if (isCurrent) {
      await EmploymentHistory.updateMany(
        { user: req.user.id, isCurrent: true },
        { isCurrent: false, endDate: new Date(startDate) }
      );
    }

    const history = await EmploymentHistory.create({
      user: req.user.id,
      companyName: companyName.trim(),
      jobTitle: jobTitle.trim(),
      startDate: new Date(startDate),
      endDate: isCurrent ? null : (endDate ? new Date(endDate) : null),
      isCurrent: !!isCurrent,
      startingSalary: Number(startingSalary) || 0,
      finalSalary: Number(finalSalary) || 0,
      currency: currency || 'INR',
      reasonForLeaving: reasonForLeaving ? reasonForLeaving.trim() : '',
      notes: notes ? notes.trim() : '',
    });

    res.status(201).json({
      success: true,
      message: 'Employment history record added successfully.',
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update employment history entry
// @route   PUT /api/employment-history/:id
// @access  Private
const updateHistory = async (req, res, next) => {
  try {
    const {
      companyName,
      jobTitle,
      startDate,
      endDate,
      isCurrent,
      startingSalary,
      finalSalary,
      currency,
      reasonForLeaving,
      notes,
    } = req.body;

    let history = await EmploymentHistory.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!history) {
      return res.status(404).json({
        success: false,
        message: 'Employment history record not found.',
      });
    }

    if (isCurrent && !history.isCurrent) {
      await EmploymentHistory.updateMany(
        { user: req.user.id, isCurrent: true, _id: { $ne: req.params.id } },
        { isCurrent: false, endDate: new Date(startDate) }
      );
    }

    history.companyName = companyName ? companyName.trim() : history.companyName;
    history.jobTitle = jobTitle ? jobTitle.trim() : history.jobTitle;
    if (startDate) history.startDate = new Date(startDate);
    history.isCurrent = isCurrent !== undefined ? !!isCurrent : history.isCurrent;
    history.endDate = history.isCurrent ? null : (endDate ? new Date(endDate) : null);
    if (startingSalary !== undefined) history.startingSalary = Number(startingSalary);
    if (finalSalary !== undefined) history.finalSalary = Number(finalSalary);
    if (currency) history.currency = currency;
    if (reasonForLeaving !== undefined) history.reasonForLeaving = reasonForLeaving.trim();
    if (notes !== undefined) history.notes = notes.trim();

    await history.save();

    res.status(200).json({
      success: true,
      message: 'Employment history updated successfully.',
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete employment history entry
// @route   DELETE /api/employment-history/:id
// @access  Private
const deleteHistory = async (req, res, next) => {
  try {
    const history = await EmploymentHistory.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!history) {
      return res.status(404).json({
        success: false,
        message: 'Employment history record not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Employment record deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHistories,
  createHistory,
  updateHistory,
  deleteHistory,
};
